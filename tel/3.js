var token = "1953901207:AAEpzQuQ_4Zfu7wGsjyN2TgaTi1fQBj3dRE"; 
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbxeD0rIUXqv91Oixqfw5il2TTj19UXCxzfPbFGC5VaK9oQT779O_I6BdwLC7QJyXZSdVQ/exec";



function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  
}

function sendText(chatId, text, keyBoard) {
  var data = {
    method: "post",
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
//set spreadsheet 
var ssId = "1d6rPcyc1HzXGTNqQfEr6dus2hUAGE-NOwEaCBpdANJc";
var expenseSheet =  SpreadsheetApp.openById(ssId).getSheetByName("Sheet1");

  
  var keyBoard = {
  "inline_keyboard": [
    [
      {"text": "ТИМ (BIM)", 'url': 'https://www.emiia.ai'},
      {"text": "ЭДО (EDM)", 'url': 'https://www.emiia.ai/'}
    ],
    [
      {"text": "CLOUD EMIIA.AI", 'url': 'https://www.emiia.ai'},
      {"text": "DATA ANALYSIS", 'url': 'https://www.emiia.ai'}
    ]
  ]
};


  
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
    
  } else if (contents.message) {
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
  } else {
    sendText(id_message, "Hi " + firstName +  ", you may send me your expenses with format: 'item = price'. You may also pull your expense reports:",keyBoard)
  }
  
}
  
}
