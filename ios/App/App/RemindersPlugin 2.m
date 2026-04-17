#import <Capacitor/Capacitor.h>

CAP_PLUGIN(RemindersPlugin, "Reminders",
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncItems, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCompletions, CAPPluginReturnPromise);
)
