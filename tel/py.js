from telebot import types
import telebot

bot = telebot.TeleBot('')

ALLOWED_CHAT_IDS = [1005942370, 987654321] # список разрешенных chat_id


def webAppKeyboard():
    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
    webAppBim = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
    webAppEdm = types.WebAppInfo("https://games.mihailgok.ru")
    webAppCloud = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
    webAppData = types.WebAppInfo("https://games.mihailgok.ru")
    one_butt = types.KeyboardButton(text="ТИМ (BIM)", web_app=webAppBim)
    two_butt = types.KeyboardButton(text="ЭДО (EDM)", web_app=webAppEdm)
    three_butt = types.KeyboardButton(text="CLOUD EMIIA.AI", web_app=webAppCloud)
    four_butt = types.KeyboardButton(text="DATA ANALYSIS", web_app=webAppData)
    keyboard.add(one_butt, two_butt)
    keyboard.add(three_butt, four_butt)
    return keyboard


def webAppKeyboardInline():
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    webApp = types.WebAppInfo("https://telegram.mihailgok.ru")
    one = types.InlineKeyboardButton(text="Веб приложение", web_app=webApp)
    keyboard.add(one)
    return keyboard


@bot.message_handler(commands=['start'])
def start_fun(message):
    if message.chat.id in ALLOWED_CHAT_IDS: # проверяем, что chat_id пользователя разрешен
        bot.send_message(message.chat.id, 'Привет, я бот для проверки телеграмм webapps!)\nЗапустить тестовые страницы можно нажав на кнопки.', parse_mode="Markdown", reply_markup=webAppKeyboard())
    else:
        bot.send_message(message.chat.id, 'К сожалению, вы не имеете доступа к использованию этого бота.')


@bot.message_handler(content_types="text")
def new_mes(message):
    start_fun(message)


@bot.message_handler(content_types="web_app_data")
def answer(webAppMes):
    if webAppMes.chat.id in ALLOWED_CHAT_IDS: # проверяем, что chat_id пользователя разрешен
        print(webAppMes)
        print(webAppMes.web_app_data.data)
        bot.send_message(webAppMes.chat.id, f"получили информацию из веб-приложения: {webAppMes.web_app_data.data}")
    else:
        bot.send_message(webAppMes.chat.id, 'К сожалению, вы не имеете доступа к использованию этого бота.')

if __name__ == '__main__':
   bot.infinity_polling()
