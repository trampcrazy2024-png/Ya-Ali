package com.yaali.assistant.plugins;

import android.content.Intent;
import android.app.Activity;
import com.getcapacitor.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;
import java.io.*;

@CapacitorPlugin(name = "LocalAI")
public class LocalAIPlugin extends Plugin {
    private File loadedModel;

    @PluginMethod
    public void pickModel(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(call, intent, "modelPicked");
    }

    @ActivityCallback
    private void modelPicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Model selection cancelled"); return;
        }
        Uri uri=result.getData().getData();
        try { getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch(Exception ignored) {}
        try {
            File dest=copyUri(uri);
            JSObject r=new JSObject(); r.put("path",dest.getAbsolutePath()); r.put("name",dest.getName()); r.put("sizeBytes",dest.length()); call.resolve(r);
        } catch(Exception e){call.reject("Cannot import model: "+e.getMessage());}
    }

    private File copyUri(Uri uri) throws Exception {
        String name="model.gguf";
        android.database.Cursor c=getContext().getContentResolver().query(uri,null,null,null,null);
        if(c!=null){try{int i=c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);if(i>=0&&c.moveToFirst()&&c.getString(i)!=null)name=c.getString(i);}finally{c.close();}}
        File dir=new File(getContext().getFilesDir(),"models"); if(!dir.exists()&&!dir.mkdirs())throw new IOException("cannot create models directory");
        File dest=new File(dir,name);
        try(InputStream in=getContext().getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(dest)){
            if(in==null)throw new IOException("cannot open selected file"); byte[] b=new byte[1024*1024]; int n; while((n=in.read(b))!=-1)out.write(b,0,n);
        }
        return dest;
    }

    @PluginMethod
    public void copyModel(PluginCall call) { call.reject("Use the model picker to import a GGUF model into protected app storage."); }

    @PluginMethod
    public void loadModel(PluginCall call){
        String path=call.getString("path",""); if(path.isEmpty()){call.reject("path is required");return;}
        File f=new File(path); if(!f.exists()||!f.isFile()){call.reject("Model not found");return;}
        loadedModel=f; JSObject r=new JSObject();r.put("loaded",true);r.put("path",f.getAbsolutePath());r.put("name",f.getName());r.put("sizeBytes",f.length());call.resolve(r);
    }
    @PluginMethod public void unloadModel(PluginCall call){loadedModel=null;call.resolve();}
    @PluginMethod public void status(PluginCall call){JSObject r=new JSObject();r.put("loaded",loadedModel!=null);if(loadedModel!=null){r.put("path",loadedModel.getAbsolutePath());r.put("name",loadedModel.getName());r.put("sizeBytes",loadedModel.length());}call.resolve(r);}
    @PluginMethod public void generate(PluginCall call){
        call.reject("Local GGUF model is imported, but native llama.cpp inference is not bundled in this build.");
    }
}
