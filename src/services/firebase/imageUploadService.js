import storage from '@react-native-firebase/storage';

// Service for uploading images to Firebase Storage
export const imageUploadService = {
  /**
   * Upload a local image file to Firebase Storage and return its download URL.
   * @param {string} filePath - Local file path (e.g. from image picker)
   * @param {string} [folder='loads'] - Optional folder name in Storage
   */
  uploadImage: async (filePath, folder = 'loads') => {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    try {
      const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
      const timestamp = Date.now();
      const path = `${folder}/${timestamp}_${filename}`;

      const reference = storage().ref(path);

      // putFile uploads from local filesystem path
      await reference.putFile(filePath);

      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  },
};
