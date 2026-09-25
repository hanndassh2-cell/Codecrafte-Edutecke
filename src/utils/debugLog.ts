export const debugLog = (component: string, action: string, data: any) => {
  if (process.env.NODE_ENV !== "production") {
    console.groupCollapsed(`[Debug] ${component} - ${action}`);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Data:", data);
    console.groupEnd();
  }
};
