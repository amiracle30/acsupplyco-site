/**
 * AC Supply Co — quote request receiver (Google Apps Script)
 *
 * Appends one row per quote request to the "Quotes" sheet and emails a summary.
 * Contains no secrets: the web-app URL is the only thing that connects it to the site.
 *
 * SET-UP (about three minutes)
 * 1. Create a Google Sheet called "AC Supply — Quote requests". Extensions → Apps Script.
 *    Delete the sample code, paste this file, save.
 * 2. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 *    Approve the permissions (it needs Sheets + Gmail send for your own account only).
 * 3. Copy the web-app URL (ends in /exec) into QUOTE_SHEET_URL at the top of
 *    assets/js/quote-page.js, rebuild nothing (it is a static file) and commit.
 *
 * The first request creates the header row. Re-deploy ("Manage deployments → edit → new version")
 * whenever you change this script; the URL stays the same.
 */
var SHEET_NAME = 'Quotes';
var NOTIFY = 'sales@acsupplyco.co.uk';

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Received', 'Business', 'Contact', 'Email', 'Phone', 'Postcode', 'Needed by', 'Items', 'Total (ex VAT)', 'Lines', 'Message', 'Status']);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var lines = data.lines || [];
  var text = lines.map(function (l, i) {
    var opts = (l.options || []).map(function (o) { return o.label + ': ' + o.value; }).join(', ');
    var qty = l.qty ? String(l.qty) : 'custom';
    var price = l.unit ? l.unit + ' each, ' + l.subtotal : 'to be quoted';
    return (i + 1) + '. ' + l.product + ' [' + (l.sku || 'no SKU') + '] — ' + opts + ' — qty ' + qty + ' — ' + price;
  }).join('\n');
  sheet.appendRow([
    new Date(), data.business_name || '', data.name || '', data.email || '', data.phone || '',
    data.delivery_postcode || '', data.needed_by || '', lines.length, data.quote_total || '', text, data.message || '', 'New'
  ]);
  var subject = 'New quote request — ' + (data.quote_total || 'to be quoted') + ' — ' + (data.business_name || data.name || 'unknown');
  MailApp.sendEmail({
    to: NOTIFY,
    subject: subject,
    body: [
      (data.business_name || '') + ' · ' + (data.name || '') + ' · ' + (data.email || '') + ' · ' + (data.phone || ''),
      'Delivery postcode: ' + (data.delivery_postcode || '—') + '    Needed by: ' + (data.needed_by || '—'),
      '', text, '', 'Total: ' + (data.quote_total || 'to be quoted'),
      '', 'Message: ' + (data.message || '—'),
      '', 'Sheet: ' + ss.getUrl()
    ].join('\n')
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
