var token = "";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbwbxmD-Kmxsgq4__14GZXPF6gg2pBU6Uw2Dv1jtsYAppQY-c7qwikgFnE7NMhbO_pQRlg/exec";
var webview_url = "https://www.emiia.ai";

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
}

function keyboardButtonSimpleWebView(text, url) {
  return {
    "text": text,
    "url": webview_url + "?url=" + encodeURIComponent(url)
  };
}

function doPost(e) {
  //parse user data
  var contents = JSON.parse(e.postData.contents);
  var chat_id = contents.message.chat.id;
  
  //list of allowed user ids
  var allowed_ids = [1005942370, 67890];
  
  if (allowed_ids.indexOf(chat_id) === -1) {
    //send error message to user
    var message = "You are not authorized to use this bot.";
    var url = telegramUrl + "/sendMessage?chat_id=" + chat_id + "&text=" + message;
    UrlFetchApp.fetch(url);
    return;
  }
  
  //continue with bot logic for authorized users
  // ...
  
  //send keyboard to user
  var keyBoard = {
    "keyboard": [
      [keyboardButtonSimpleWebView('ТИМ (BIM)', 'https://www.emiia.ai'), keyboardButtonSimpleWebView('ЭДО (EDM)', 'https://www.emiia.ai')],
      [keyboardButtonSimpleWebView('DATA ANALYSIS', 'https://www.emiia.ai'), keyboardButtonSimpleWebView('CLOUD EMIIA.AI', 'https://www.emiia.ai')]
    ],
    'resize_keyboard': true,
    'one_time_keyboard': true,
    'selective': false
  };
  var payload = {
    "method": "sendMessage",
    "chat_id": chat_id,
    "text": "Please choose an option:",
    "reply_markup": keyBoard
  };
  var options = {
    "method": "post",
    "payload": JSON.stringify(payload),
    "contentType": "application/json"
  };
  UrlFetchApp.fetch(telegramUrl + "/", options);
}
