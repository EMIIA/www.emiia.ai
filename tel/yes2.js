var token = ""; 
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbzAwr7XK61cN4rZd3dkU_Il0YOlLAkK2Nx2CY_v4Aql8fhM3fxcXVU9_amnnDWFUB54EQ/exec";



function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  
}

function sendText(chatId, text, keyBoard) {
  var data = {
    method: "post",
    url: 'https://emiia.ai',
    payload: {
      method: "sendMessage",
      chat_id: String(chatId),
      text: text,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyBoard)
    }
  };





  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', data);
}












function flatten(arrayOfArrays) {
  return [].concat.apply([], arrayOfArrays); 
}






function doPost(e) {
//parse user data
var contents = JSON.parse(e.postData.contents);





  // check if the message is sent by user with specific ID
  if (contents.message && contents.message.chat.id == '1005942370') {
    chat_id = contents.message.chat.id;
  } else if (contents.callback_query && contents.callback_query.from.id == '1005942370') {
    chat_id = contents.callback_query.from.id;
  } else {
    // if the message is not sent by the allowed user, ignore the message
    return;
  }

 









//set spreadsheet 




var ssId = "";




var expenseSheet =  SpreadsheetApp.openById(ssId).getSheetByName("Sheet1");















  
 var keyBoard = {
  "keyboard": [
    [{text: 'ТИМ (BIM)', url: 'https://www.emiia.ai'},{"text": "ЭДО (EDM)", url: 'https://www.emiia.ai'}],
    [{"text": "DATA ANALYSIS"},{"text": "CLOUD EMIIA.AI"}]
  ],
        'resize_keyboard': true,
        'one_time_keyboard': true,
        'selective': false

};






function getToken() {
  var ss = SpreadsheetApp.openById('1d6rPcyc1HzXGTNqQfEr6dus2hUAGE-NOwEaCBpdANJc');
  var sheet = ss.getSheetByName('tokens');
  var token = sheet.getRange('A1').getValue();
  return token;
};





var webAppInfo = {
  execUrl: 'https://www.emiia.ai',
  devMode: false,
};

var webAppUrl = {}


  
  if (contents.callback_query) {
    var id_callback = contents.callback_query.from.id;
     var data = contents.callback_query.data;
    
    if (data == 'budget') {
      var budget = expenseSheet.getRange(1, 2).getValue();
      sendText(id_callback,"P" + budget + " is your allocated budget for the week" );
    } else if (data == 'total') {
      var total = expenseSheet.getRange(2, 2).getValue();
      sendText(id_callback,"P" + total + " is your total spent so far" );
    } else if (data == 'balance') {
      var balance = expenseSheet.getRange(3, 2).getValue();
      sendText(id_callback,"P" + balance + " is your money left" );
    } else if (data == 'expenses') {
      var expenses = [];
      var lr = expenseSheet.getDataRange().getLastRow();
      
      for(var i = 6; i <=lr; i++) {
        var date = expenseSheet.getRange(i,1).getValue();
        var newDate = date.getMonth()+1+'/'+date.getDate(); 
        var item = expenseSheet.getRange(i,2).getValue();
        var price = expenseSheet.getRange(i,3).getValue();
        
        expenses.push("\n" + newDate + "  " + item + "  " + price );
        var expenseList = expenses.join("\n");
      }
      sendText(id_callback, decodeURI( "Here are your expenses: %0A " + expenseList ));
    }
    
  } 
  
  
  
  else if (contents.message) {
    var id_message = contents.message.from.id; 
    var text = contents.message.text; 
    var item = text.split("=");
    var firstName = contents.message.from.first_name;
    
      if (text.indexOf("=") !== -1 ) { 
    //get date
     var nowDate = new Date(); 
     var date = nowDate.getMonth()+1+'/'+nowDate.getDate(); 
   expenseSheet.appendRow([date, item[0], item[1]]);
    sendText(id_message,"Ok. Added to your expense sheet"); 
  } 
  
  
  
  else {
    sendText(id_message, "" + firstName +  ", доступ к платформенным программным инструментам EMIIA.AI MRV активирован (SDK/API).",keyBoard)
  }
  
}



}
