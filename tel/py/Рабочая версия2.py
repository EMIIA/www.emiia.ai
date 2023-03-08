from telebot import types
import telebot

bot = telebot.TeleBot('1999907852:AAEqDGrWY3gRPhH9lXjcc9NaiV71HtqoF5M')

allowed_users = {"1005942370", "user2_id", "user3_id"}


def web_app_keyboard(user_id):
    if str(user_id) in allowed_users:
        keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
        web_app_bim = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_edm = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_cloud = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
        web_app_data = types.WebAppInfo("https://games.mihailgok.ru")
        one_button = types.KeyboardButton(text="ТИМ (BIM)", web_app=web_app_bim)
        two_button = types.KeyboardButton(text="ЭДО (EDM)", web_app=web_app_edm)
        three_button = types.KeyboardButton(text="CLOUD EMIIA.AI", web_app=web_app_cloud)
        four_button = types.KeyboardButton(text="DATA ANALYSIS", web_app=web_app_data)
        keyboard.add(one_button, two_button)
        keyboard.add(three_button, four_button)
        return keyboard





    else:
        bot.send_message(user_id, "У вас нет разрешения на использование клавиатуры.")
        return None




@bot.message_handler(commands=['start'])
def start_fun(message):
    user_id = message.from_user.id # getting user_id from message object
    bot.send_message(user_id, 'Привет {}!, я бот для проверки телеграмм webapps!)\nЗапустить тестовые страницы можно нажав на кнопки.'.format(user_id), parse_mode="Markdown", reply_markup=web_app_keyboard(user_id))














@bot.message_handler(content_types=["text"])
def new_mes(message):
    start_fun(message)





if __name__ == '__main__':
    bot.infinity_polling(none_stop=True)




