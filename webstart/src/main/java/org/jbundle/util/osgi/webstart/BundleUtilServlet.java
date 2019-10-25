package org.jbundle.util.osgi.webstart;

import static java.util.jar.JarFile.MANIFEST_NAME;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;
import java.util.jar.Pack200;
import java.util.jar.Pack200.Packer;
import java.util.jar.Pack200.Unpacker;
import java.util.zip.CRC32;
import java.util.zip.GZIPOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.jbundle.util.osgi.ClassFinder;
import org.jbundle.util.osgi.ClassService;
import org.jbundle.util.osgi.finder.ClassServiceUtility;
import org.jbundle.util.osgi.webstart.sign.SigningUtil;
import org.osgi.framework.Bundle;
import org.osgi.framework.Constants;

/**
 * BundleUtilServlet - Bundle information handling and converting bundles to jars/gzips.
 * @author don
 *
 */
public class BundleUtilServlet extends BundleCacheServlet /*JnlpDownloadServlet*/
{
    public static final boolean REJAR_BEFORE_PACK = false;     // Unjarring and re-jarring without compression creates a smaller gzipped file - Disabled - does not reduce size

    private static final long serialVersionUID = 1L;

    public static final String KEYSTORE_PATH = "keystorePath";
    public static final String TIMESTAMP_URL = "timestampURL";
    public static final String KEYSTORE_PASSWORK = "keystorePassword";
    public static final String KEYSTORE_ALIAS = "keystoreAlias";

    public static final String MANIFEST_DIR = "META-INF/";
	public static final String MANIFEST_PATH = MANIFEST_DIR + "MANIFEST.MF";
    public static final int ONE_SEC_IN_MS = 1000;

	public static final String[] EMPTY_ARRAY = new String[0];
	
	/**
	 * Create a jar for this bundle and move all the classes to the new jar.
	 * Note: I followed the same logic as in the java jar tool.
	 * @param bundle
	 * @param filename
	 * @param forceScanBundle Scan the bundle for package names even if the cache is current
	 * @param pack Also do a pack gzip on the jar.
	 * @return All the package names in the bundle or null if I am using the cached jar.
	 */
	public String[] moveBundleToJar(Bundle bundle, String filename, boolean forceScanBundle, boolean pack)
	{
        File fileOut = getBundleContext().getDataFile(filename);
        boolean createNewJar = true;
        if (fileOut.exists())
            if (bundle.getLastModified() <= (fileOut.lastModified() + ONE_SEC_IN_MS))   // File sys is usually accurate to sec 
            {
                createNewJar = false;
                if (!forceScanBundle)
                    return null;    // Use cached jar file
            }

        String[] packages = null;

        boolean jarCreated = false;
        if ((createNewJar) && (pack))
        {
            packages = this.jarFile(bundle, createNewJar, fileOut, !REJAR_BEFORE_PACK);   // jar WITHOUT compression, pack, and gzip.
		    this.packGzipJar(fileOut.getPath(), true);
		    if (REJAR_BEFORE_PACK)
		        fileOut.delete();
		    else
		        jarCreated = true;
        }
		
        if (!jarCreated)
            packages = this.jarFile(bundle, createNewJar, fileOut, true);   // Jar with compression for non-gzip clients

        return packages;
	}
	/**
	 * Jar this bundle.
     * @param bundle
     * @param createNewJar - If false, don't create a jar, just scan the bundle
     * @param fileout
     * @param compressJar - If false, Don't compress the jar
     * @return All the package names in the bundle or null if I am using the cached jar.
	 */
    public String[] jarFile(Bundle bundle, boolean createNewJar, File fileOut, boolean compressJar)
    {
        Set<String> packages = new HashSet<String>();
        try {
            Manifest manifest = null;
            String path = MANIFEST_PATH;
            URL url = bundle.getEntry(path);
            JarOutputStream zos = null;
            if (createNewJar)
            {
                InputStream in = null;
                if (url != null)
                {
                    try {
                        in = url.openStream();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                if (in != null)
                {
                    manifest = new Manifest(new BufferedInputStream(in));
                } else {
                    manifest = new Manifest();
                }
                
                FileOutputStream out = new FileOutputStream(fileOut);
                
                zos = new JarOutputStream(out);
                if (!compressJar) {
                     zos.setMethod(ZipOutputStream.STORED);
                }
                if (manifest != null) {
                    JarEntry e = new JarEntry(MANIFEST_DIR);
                    e.setTime(System.currentTimeMillis());
                    e.setSize(0);
                    e.setCrc(0);
                    zos.putNextEntry(e);
                    e = new JarEntry(MANIFEST_NAME);
                    e.setTime(System.currentTimeMillis());
                    if (!compressJar) {
                        crc32Manifest(e, manifest);
                    }
                    zos.putNextEntry(e);
                    manifest.write(zos);
                    zos.closeEntry();
                }
            }
            String paths = "/";
            String filePattern = "*";
            @SuppressWarnings("unchecked")
            Enumeration<URL> entries = bundle.findEntries(paths, filePattern, true);
            while (entries.hasMoreElements())
            {
                url = entries.nextElement();
                String name = url.getPath();
                if (name.startsWith("/"))
                    name = name.substring(1);
                name = entryName(name);
                if (name.equals("") || name.equals("."))
                    continue;
                if ((name.equalsIgnoreCase(MANIFEST_DIR)) || (name.equalsIgnoreCase(MANIFEST_PATH)))
                    continue;
                boolean isDir = name.endsWith("/");
                if (createNewJar)
                {
                    long size = isDir ? 0 : -1; // ***????****  file.length();
                    JarEntry e = new JarEntry(name);
                    e.setTime(fileOut.lastModified()); //???
                    if (size == 0) {
                        e.setMethod(ZipEntry.STORED);
                        e.setSize(0);
                        e.setCrc(0);
                    } else if (!compressJar) {
                        e.setMethod(ZipEntry.STORED);
                        size = crc32File(e, url);
                        e.setSize(size);
                    }
                    zos.putNextEntry(e);
                    if (!isDir) {
                        InputStream inStream = url.openStream();
                        copyStream(inStream, zos, false);
                        inStream.close();
                    }
                    zos.closeEntry();
                }
                
                if (!isDir)
                    if (!(name.toUpperCase().startsWith(MANIFEST_DIR)))
                        packages.add(getPackageFromName(name));
            }
            if (zos != null)
                zos.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return packages.toArray(EMPTY_ARRAY);
    }
	/**
	 * Pack and gzip this jar file.
	 * Note: Most of this code comes from the oracle (thanks!) sample at:
	 * http://docs.oracle.com/javase/1.5.0/docs/api/java/util/jar/Pack200.html
	 * Note: I pack and then unpack to recreate the original jar since pack messes up the magic number.
	 * @param jarFileName
	 */
	public void packGzipJar(String jarFileName, boolean modifyOriginalJar)
	{
	    String packFileName = jarFileName + ".pack";
	    Packer packer = Pack200.newPacker();

	    // Initialize the state by setting the desired properties
	    Map<String,String> p = packer.properties();
	    // take more time choosing codings for better compression
	    p.put(Packer.EFFORT, "7");  // default is "5"
	    // use largest-possible archive segments (>10% better compression).
	    p.put(Packer.SEGMENT_LIMIT, "-1");
	    // reorder files for better compression.
	    p.put(Packer.KEEP_FILE_ORDER, Packer.FALSE);
	    // smear modification times to a single value.
	    p.put(Packer.MODIFICATION_TIME, Packer.LATEST);
	    // ignore all JAR deflation requests,
	    // transmitting a single request to use "store" mode.
	    p.put(Packer.DEFLATE_HINT, Packer.FALSE);
	    // discard debug attributes
	    p.put(Packer.CODE_ATTRIBUTE_PFX+"LineNumberTable", Packer.STRIP);
	    // throw an error if an attribute is unrecognized
	    p.put(Packer.UNKNOWN_ATTRIBUTE, Packer.ERROR);
	    // pass one class directory uncompressed: Don't modify the manifest
	    p.put(Packer.PASS_FILE_PFX+0, "META-INF");
	    try {
	        JarFile jarFile = new JarFile(jarFileName);
	        FileOutputStream fos = new FileOutputStream(packFileName);
	        // Call the packer
	        packer.pack(jarFile, fos);
	        jarFile.close();
	        fos.close();
	        
	        File f = new File(packFileName);
	        String reJaredFileName = jarFileName;
	        if (!modifyOriginalJar)
	            reJaredFileName = reJaredFileName + ".temp";
	        FileOutputStream fostream = new FileOutputStream(reJaredFileName);
	        JarOutputStream jostream = new JarOutputStream(fostream);
	        Unpacker unpacker = Pack200.newUnpacker();
	        // Call the unpacker
	        unpacker.unpack(f, jostream);
	        // Must explicitly close the output.
	        jostream.close();
	        
	        String keystorePath = getProperty(KEYSTORE_PATH);
            if (keystorePath != null) {
            	String timestampURL = getProperty(TIMESTAMP_URL);
            	String password = getProperty(KEYSTORE_PASSWORK);
            	String alias = getProperty(KEYSTORE_ALIAS);
            	SigningUtil.sign(timestampURL, password, alias, reJaredFileName, keystorePath);
            }
	        
	        // Need to repack it so the new magic number will be correct
            jarFile = new JarFile(reJaredFileName);
            fos = new FileOutputStream(packFileName);
            // Call the packer
            packer.pack(jarFile, fos);
            jarFile.close();
            fos.close();	        
            if (!modifyOriginalJar)
            {
                File reJaredFile = new File(reJaredFileName);
                reJaredFile.delete();   // Delete the temp jar file
            }
	    } catch (IOException ioe) {
	        ioe.printStackTrace();
	    }
	    
	    this.gzipFile(packFileName);
	    // Delete the pack file
        File packFile = new File(packFileName);
        packFile.delete();
	}
	/**
	 * GZip this pack file.
	 * @param pathName
	 */
	public void gzipFile(String pathName)
	{
	    try {
            InputStream inStream = new FileInputStream(pathName);
            // serialize the pack file
            FileOutputStream fos = new  FileOutputStream(pathName + ".gz");
            GZIPOutputStream outStream = new GZIPOutputStream(fos);
            
            copyStream(inStream, outStream, false);
            
            inStream.close();
            outStream.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
	}
	/**
	 * Unpack bundle files and add them to the destination directory.
	 * @param bundle
	 * @param rootPathInJar
	 * @param destDir
	 */
	public static void transferBundleFiles(Bundle bundle, String rootPathInJar, String destDir)
	{
		if ((!destDir.endsWith("/")) && (!destDir.endsWith(File.separator)))
			destDir = destDir + File.separator;
	    Enumeration<?> paths = bundle.findEntries(rootPathInJar, "*", true);
	    if (paths != null)
	    {
	    	while (paths.hasMoreElements())
	    	{
				URL url = (URL)paths.nextElement();
				String fileName = url.getFile();
				if ((!fileName.endsWith("/")) && (!fileName.endsWith(File.separator)))
				{
					int startLocalPath = fileName.indexOf(rootPathInJar) + rootPathInJar.length();
					if (startLocalPath > 0)
					{	// Always
						fileName = fileName.substring(startLocalPath);
						if ((fileName.startsWith("/")) || (fileName.startsWith(File.separator)))
							fileName = fileName.substring(1);
						fileName = destDir + fileName;
	                	File file = new File(fileName);
	                	file = file.getParentFile();
	                	if (!file.exists())
	                		file.mkdirs();
						try {
							FileOutputStream outStream = new FileOutputStream(fileName);
							copyStream(url.openStream(), outStream, false);
						} catch (FileNotFoundException e) {
							e.printStackTrace();
						} catch (IOException e) {
							e.printStackTrace();
						}
					}
				}
	    	}
	    }
	}

	/**
	 * Very similar to the code in jar tool.
	 * @param name
	 * @return
	 */
    private String entryName(String name) {
        name = name.replace(File.separatorChar, '/');
        String matchPath = "";
        /* Need to add code to consolidate paths
        for (String path : paths) {
            if (name.startsWith(path)
                && (path.length() > matchPath.length())) {
                matchPath = path;
            }
        }
        */
        name = name.substring(matchPath.length());

        if (name.startsWith("/")) {
            name = name.substring(1);
        } else if (name.startsWith("./")) {
            name = name.substring(2);
        }
        return name;
    }
	/**
	 * Get the package name from the jar entry path.
	 * @param name
	 * @return
	 */
	public static String getPackageFromName(String name)
	{
		if (name.lastIndexOf('/') != -1)
			name = name.substring(0, name.lastIndexOf('/'));
		if (name.startsWith("/"))
			name = name.substring(1);
		return name.replace('/', '.');		
	}
	
    /**
     * Call the osgi utility to find the bundle for this package and version.
     * @param packageName
     * @param versionRange
     * @return
     */
	public Bundle findBundle(String packageName, String versionRange)
	{
		ClassService classService = ClassServiceUtility.getClassService();
		if (classService == null)
			return null;	// Never
		ClassFinder classFinder = classService.getClassFinder(getBundleContext());
		if (classFinder == null)
			return null;
		Bundle bundle = (Bundle)classFinder.findBundle(null, getBundleContext(), packageName, versionRange);
		if (bundle == null)
		{
	        Object resource = classFinder.deployThisResource(packageName, versionRange, false);    // Deploy, but do not start the bundle
	        if (resource != null)
	        	bundle = (Bundle)classFinder.findBundle(resource, getBundleContext(), packageName, versionRange);
		}
		return bundle;
	}
	
	/**
	 * Get this bundle header property.
	 * @param bundle
	 * @param property
	 * @return
	 */
	public static String getBundleProperty(Bundle bundle, String property)
	{
	    if (bundle == null)
	        return null;
		return (String)bundle.getHeaders().get(property);
	}
	
	/**
	 * Get the version number from the import properties.
	 * @param properties
	 * @return
	 */
    public static String getVersion(String[] properties)
    {
		if (properties.length > 0)
		{
			for (String property : properties)
			{
				if (property.startsWith(Constants.VERSION_ATTRIBUTE))
				{
					String[] props = property.split("\\ |\\[|\\]|\\(|\\)|\\=|\\\"");
					for (int i = 1; i < props.length; i++)
					{
						if (props[i].length() > 0)
							return props[i];
					}
				}
			}
		}
    	return null;
    }
    
    /**
     * Split the import properties.
     * @param value
     * @return
     */
    static public String[] parseImport(String value) {
    	return value.split(";");
    }
    
    /**
     * Split the import header properties.
     * @param value
     * @return
     */
    static public String[] parseHeader(String value, String regexInclude, String regexExclude) {

        if (value == null)
    		return EMPTY_ARRAY;
    	String[] properties = value.split(",");
    	for (int i = 0; i < properties.length; i++)
    	{
    		if (properties[i].indexOf(Constants.VERSION_ATTRIBUTE + "=") != -1)
    		{	// Version may have been split because it has commas
    			for (int j = i + 1; j < properties.length; j++)
    			{
                    if (properties[j].contains(";"))
                        break;
    	    		if (!properties[j].endsWith("\""))
    	    			break;
	    			properties[i] = properties[i] + "," + properties[j];	// Version
	    			properties[j] = "";
    			}
    		}
    		if (regexExclude != null)
    		    if (properties[i].matches(regexExclude))
    		        properties[i] = "";
            if (regexInclude != null)
                if (!properties[i].matches(regexInclude))
                    properties[i] = "";
    	}
    	return properties;
    }
    // The following code was copied directly from tool.jar.
    // Thanks Oracle!
    CRC32 crc32 = new CRC32();
   /*
    * compute the crc32 of a file.  This is necessary when the ZipOutputStream
    * is in STORED mode.
    */
   private void crc32Manifest(ZipEntry e, Manifest m) throws IOException {
       crc32.reset();
       CRC32OutputStream os = new CRC32OutputStream(crc32);
       m.write(os);
       e.setSize((long) os.n);
       e.setCrc(crc32.getValue());
   }
   /*
    * an OutputStream that doesn't send its output anywhere, (but could).
    * It's here to find the CRC32 of a manifest, necessary for STORED only
    * mode in ZIP.
    */
   final class CRC32OutputStream extends java.io.OutputStream {
       CRC32 crc;
       int n = 0;
       CRC32OutputStream(CRC32 crc) {
           this.crc = crc;
       }

       public void write(int r) throws IOException {
           crc.update(r);
           n++;
       }

       public void write(byte[] b) throws IOException {
           crc.update(b, 0, b.length);
           n += b.length;
       }

       public void write(byte[] b, int off, int len) throws IOException {
           crc.update(b, off, len);
           n += len - off;
       }
   }
   /*
    * compute the crc32 of a file.  This is necessary when the ZipOutputStream
    * is in STORED mode.
    */
   private int crc32File(ZipEntry e, URL url) throws IOException {
       InputStream is = new BufferedInputStream(url.openStream());
       byte[] buf = new byte[1024];
       crc32.reset();
       int r = 0;
       int len = 0;
       while ((r = is.read(buf)) != -1) {
           len += r;
           crc32.update(buf, 0, r);
       }
       is.close();
       e.setCrc(crc32.getValue());
       is.close();
       return len;
   }
}
