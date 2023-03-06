// @ts-nocheck
var token = ""; 
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbzAEeGWX3Mwm7o35sJQlCuEaXUswHNHwe-1fHIausUferE3qg2dXM-qftMw1fUYXbJ1eg/exec";

function setWebhook() {
var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
var response = UrlFetchApp.fetch(url);
}

function sendMessage(chat_id, text) {
var url = telegramUrl + "/sendMessage?chat_id=" + chat_id + "&text="+ text;
var response = UrlFetchApp.fetch(url);
Logger.log(response.getContentText()); 
}

function doPost(e) {
var contents = JSON.parse(e.postData.contents);
var chat_id = contents.message.from.id; 
var text = "CLOUD EMIIA.AI - The data has been loaded and processed.";
 
sendMessage(chat_id,text)
}
