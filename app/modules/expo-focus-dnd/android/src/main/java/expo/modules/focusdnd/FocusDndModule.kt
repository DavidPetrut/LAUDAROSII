package expo.modules.focusdnd

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * "Nu deranja" de sistem pe Android. Necesita permisiunea ACCESS_NOTIFICATION_POLICY
 * acordata de user (isGranted / openSettings). setDnd(true) pune telefonul pe
 * "prioritate" (blocheaza notificarile + apelurile care nu sunt exceptii), setDnd(false)
 * revine la normal.
 */
class FocusDndModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is null" }

  private fun notificationManager(): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("FocusDnd")

    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
    }

    Function("isGranted") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        notificationManager().isNotificationPolicyAccessGranted
      } else {
        false
      }
    }

    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("setDnd") { enabled: Boolean ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val nm = notificationManager()
        if (nm.isNotificationPolicyAccessGranted) {
          nm.setInterruptionFilter(
            if (enabled) NotificationManager.INTERRUPTION_FILTER_PRIORITY
            else NotificationManager.INTERRUPTION_FILTER_ALL
          )
          return@Function true
        }
      }
      false
    }
  }
}
