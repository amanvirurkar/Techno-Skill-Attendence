const DEVICE_ID_STORAGE_KEY = 'deviceId';

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (!deviceId) {
    deviceId = `device_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
};

export const getOrCreateDeviceId = getDeviceId;

export const resetDevice = () => {
  localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
};
