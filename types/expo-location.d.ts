declare module "expo-location" {
  export const requestForegroundPermissionsAsync: (
    ...args: any[]
  ) => Promise<{ status: "granted" | "denied" | string }>;

  export const getCurrentPositionAsync: (
    options?: any,
  ) => Promise<{
    coords: {
      latitude: number;
      longitude: number;
      [key: string]: any;
    };
    [key: string]: any;
  }>;

  export const Accuracy: {
    [key: string]: any;
  };
}

