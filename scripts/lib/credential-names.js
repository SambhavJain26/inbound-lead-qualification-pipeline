/**
 * n8n credential display names, in one place.
 *
 * These strings are LOAD-BEARING. Since this project runs two Telegram bots,
 * `scripts/import-workflows.js` resolves Telegram credential ids by NAME rather
 * than by type - a type lookup cannot tell the two apart, and picking the wrong
 * one makes WF1 steal the manager bot's webhook with no error anywhere.
 *
 * Three files have to agree on these names:
 *   - scripts/setup-credentials.js   creates the credentials under these names
 *   - scripts/lib/wf-common.js       writes them into the workflow JSON
 *   - scripts/import-workflows.js    looks the ids up by them
 *
 * Change one of these and you must re-run setup-credentials, rebuild every
 * workflow, and re-import.
 */

module.exports = {
  /** WF3 router, and every manager-facing alert in WF1/WF2/WF4. */
  TELEGRAM_MANAGER: "Leasing Telegram (manager bot)",
  /** WF1's prospect conversation. A separate @BotFather bot. */
  TELEGRAM_PROSPECT: "Leasing Telegram (prospect bot)",
};
