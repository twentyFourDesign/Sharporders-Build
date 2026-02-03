import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

export const imageUploadService = {
  uploadImage: async (filePath, folder = 'loads') => {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    try {
      // ✅ Check initial auth state
      let user = auth().currentUser;
      console.log('=== AUTH DEBUG ===');
      console.log('Initial user:', user ? user.uid : 'NO USER');
      console.log('Is anonymous:', user?.isAnonymous);
      
      // ✅ Force sign in anonymously EVERY TIME for testing
      console.log('Signing in anonymously...');
      const userCredential = await auth().signInAnonymously();
      user = userCredential.user;
      console.log('Sign-in successful!');
      console.log('User ID:', user.uid);
      console.log('Is anonymous:', user.isAnonymous);

      // ✅ Get and log the auth token
      const token = await user.getIdToken();
      console.log('Auth token exists:', !!token);
      console.log('Token length:', token?.length);

      // ✅ Wait a moment for auth to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Verify current user one more time
      const verifyUser = auth().currentUser;
      console.log('Verified user before upload:', verifyUser ? verifyUser.uid : 'NO USER');
      console.log('=== END AUTH DEBUG ===');

      if (!verifyUser) {
        throw new Error('Failed to authenticate user');
      }

      // iOS-safe file URI
      const uploadUri = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;

      const filename = uploadUri.substring(uploadUri.lastIndexOf('/') + 1);
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const path = `${folder}/${timestamp}_${safeFilename}`;

      console.log('Uploading to:', path);

      const reference = storage().ref(path);
      
      console.log('Starting putFile...');
      await reference.putFile(uploadUri);
      console.log('putFile completed!');

      const downloadURL = await reference.getDownloadURL();
      console.log('Upload successful:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Image upload error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  },
};