package org.jbundle.util.osgi.webstart.sign;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.jar.JarInputStream;
import java.util.jar.JarOutputStream;
import java.util.jar.Pack200;
import java.util.jar.Pack200.Packer;
import java.util.jar.Pack200.Unpacker;

import sun.security.tools.jarsigner.Main;

public class SigningUtil {  
  
    public static void main(String[] args) throws Exception {  
    	String timestampURL = "http://timestamp.digicert.com";
    	String password = "password";
    	String alias = "tourgeek";
    	String jar = args[0];
    	String keystore = "/home/dcorley/Downloads/tourgeek.jks";

    	SigningUtil.sign(timestampURL, password, alias, jar, keystore);
/*
    	File dir = new File(System.getProperty("user.dir"));
        //File orig = new File(dir, "orig.jconsole.jar");
        File orig = new File(dir, jar);
        File jar2 = new File(dir, "jar.jar");
        copy(orig, jar2);
        File packed = new File(dir, jar2.getName() + ".pack");  
        pack(jar2, packed);
        unpack(packed, jar2);
        sign(jar2, new File(dir, "test.store"));  
        pack(jar2, packed);
        unpack(packed, jar2);
*/
    }  
  
    private static void copy(File src, File dst) throws IOException {  
        FileInputStream in = new FileInputStream(src);  
        FileOutputStream out = new FileOutputStream(dst);  
        byte[] buffer = new byte[4096];  
        int read;  
        while ((read = in.read(buffer)) != -1) {  
            out.write(buffer, 0, read);  
        }  
        in.close();  
        out.close();  
    }  
  
    private static void pack(File src, File dest) throws Exception {  
        Packer packer = Pack200.newPacker();  
        FileOutputStream out = new FileOutputStream(dest);  
        packer.pack(new JarInputStream(new FileInputStream(src)), out);  
        out.close();  
    }  
  
    private static void unpack(File src, File dest) throws Exception {  
        Unpacker unpacker = Pack200.newUnpacker();  
        JarOutputStream out = new JarOutputStream(new FileOutputStream(dest));  
        unpacker.unpack(new FileInputStream(src), out);  
        out.close();  
    }  
  
    public static void sign(String timestampURL, String password, String alias, String jar, String keystore) {
    	StringBuilder sb = new StringBuilder();
    	if (timestampURL != null)
    		sb.append("-tsa,").append(timestampURL).append(',');
    	if (keystore != null)
    		sb.append("-keystore,").append(keystore).append(',');
    	if (password != null)
    		sb.append("-storepass,").append(password).append(',').append("-keypass,").append(password).append(',');
    	sb.append(jar).append(',');
    	sb.append(alias);
        String[] args = sb.toString().split(",");
        Main signer = new Main();
        try {
            signer.run(args);
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
        }
    }  
  
} 