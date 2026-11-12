package com.Quran.fadakir;

import android.accounts.Account;
import android.content.Intent;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.io.IOException;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    private static final String DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

    private GoogleSignInClient createClient(boolean includeDriveScope) {
        int clientIdResource = getContext().getResources().getIdentifier(
            "default_web_client_id", "string", getContext().getPackageName()
        );
        if (clientIdResource == 0) throw new IllegalStateException("Missing default_web_client_id from google-services.json");
        String webClientId = getContext().getString(clientIdResource);
        GoogleSignInOptions.Builder options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(webClientId);
        if (includeDriveScope) options.requestScopes(new Scope(DRIVE_APPDATA_SCOPE));
        return GoogleSignIn.getClient(getActivity(), options.build());
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        try {
            startActivityForResult(call, createClient(false).getSignInIntent(), "handleSignInResult");
        } catch (Exception error) {
            call.reject("تعذر بدء تسجيل الدخول من Google. تحقق من OAuth client وإعداد Firebase.", error);
        }
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(result.getData())
                .getResult(ApiException.class);
            String idToken = account.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                call.reject("لم يُرجع Google رمز الهوية. تحقق من Web OAuth Client ID وSHA-1 لشهادة Android.");
                return;
            }
            JSObject response = new JSObject();
            response.put("idToken", idToken);
            response.put("email", account.getEmail());
            response.put("displayName", account.getDisplayName());
            call.resolve(response);
        } catch (ApiException error) {
            call.reject(error.getStatusCode() == 12501 ? "ألغيت عملية تسجيل الدخول." : "فشل تسجيل الدخول من Google. تحقق من OAuth Android وSHA-1.", error);
        } catch (Exception error) {
            call.reject("تعذر إكمال تسجيل الدخول من Google.", error);
        }
    }

    @PluginMethod
    public void requestDriveAccess(PluginCall call) {
        try {
            startActivityForResult(call, createClient(true).getSignInIntent(), "handleDriveSignInResult");
        } catch (Exception error) {
            call.reject("تعذر بدء تفويض Drive. فعّل Google Drive API وأكمل إعداد OAuth لتطبيق Android.", error);
        }
    }

    @ActivityCallback
    private void handleDriveSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        final GoogleSignInAccount account;
        try {
            account = GoogleSignIn.getSignedInAccountFromIntent(result.getData()).getResult(ApiException.class);
        } catch (ApiException error) {
            call.reject(error.getStatusCode() == 12501 ? "ألغيت عملية ربط Google Drive." : "تعذر تفويض Google Drive. تحقق من Drive API وبيانات OAuth Android.", error);
            return;
        }

        new Thread(() -> {
            try {
                Account googleAccount = account.getAccount();
                if (googleAccount == null) throw new IllegalStateException("لم يتم اختيار حساب Google.");
                String token = GoogleAuthUtil.getToken(getContext(), googleAccount, "oauth2:" + DRIVE_APPDATA_SCOPE, new Bundle());
                JSObject response = new JSObject();
                response.put("accessToken", token);
                call.resolve(response);
            } catch (UserRecoverableAuthException error) {
                call.reject("يتطلب Google موافقة إضافية على نطاق Drive appData. أعد المحاولة ووافق على الإذن.", error);
            } catch (GoogleAuthException | IOException error) {
                call.reject("تعذر الحصول على رمز Google Drive. تأكد من تفعيل Drive API وإعداد OAuth Android وSHA-1.", error);
            } catch (Exception error) {
                call.reject("تعذر الحصول على رمز Google Drive.", error);
            }
        }).start();
    }
}
