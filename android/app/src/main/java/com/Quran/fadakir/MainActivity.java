package com.Quran.fadakir;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.Quran.fadakir.ImmersiveModePlugin;
import com.Quran.fadakir.GoogleAuthPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersiveModePlugin.class);
        registerPlugin(GoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
