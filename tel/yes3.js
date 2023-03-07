var token = "1999907852:AAEqDGrWY3gRPhH9lXjcc9NaiV71HtqoF5M";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbxgyqECV_ruP4cSrh3CDyUuG3n-eOxE5TYhq11O83T4Ey3K709PFK3wl4oDpBFu7HCfFA/exec";

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
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
    var url = "https://api.telegram.org/bot" + token + "/sendMessage?chat_id=" + chat_id + "&text=" + message;
    UrlFetchApp.fetch(url);
    return;
  }
  
  //continue with bot logic for authorized users
  // ...
}
