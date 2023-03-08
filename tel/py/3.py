from telebot import types
import telebot

bot = telebot.TeleBot('КОПИЯ ИСХОДНИКА')






def webAppKeyboard(): #создание клавиатуры с webapp кнопкой
   keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True) #создаем клавиатуру

   webAppBim = types.WebAppInfo("https://games.mihailgok.ru")
   webAppEdm = types.WebAppInfo("https://games.mihailgok.ru")
   webAppCloud = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
   webAppData = types.WebAppInfo("https://games.mihailgok.ru")
   one_butt = types.KeyboardButton(text="ТИМ (BIM)", web_app=webAppBim)
   two_butt = types.KeyboardButton(text="ЭДО (EDM)", web_app=webAppEdm)
   three_butt = types.KeyboardButton(text="CLOUD EMIIA.AI", web_app=webAppCloud)
   four_butt = types.KeyboardButton(text="DATA ANALYSIS", web_app=webAppData)
   keyboard.add(one_butt, two_butt)
   keyboard.add(three_butt, four_butt)

   return keyboard #возвращаем клавиатуру









@bot.message_handler(commands=['start']) #обрабатываем команду старт
def start_fun(message):
   bot.send_message( message.chat.id, 'Привет, я бот для проверки телеграмм webapps!)\nЗапустить тестовые страницы можно нажав на кнопки.', parse_mode="Markdown", reply_markup=webAppKeyboard()) #отправляем сообщение с нужной клавиатурой


@bot.message_handler(content_types="text")
def new_mes(message):
   start_fun(message)


@bot.message_handler(content_types="web_app_data") #получаем отправленные данные
def answer(webAppMes):
   print(webAppMes) #вся информация о сообщении
   print(webAppMes.web_app_data.data) #конкретно то что мы передали в бота
   bot.send_message(webAppMes.chat.id, f"получили инофрмацию из веб-приложения: {webAppMes.web_app_data.data}")
   #отправляем сообщение в ответ на отправку данных из веб-приложения

if __name__ == '__main__':
   bot.infinity_polling()
