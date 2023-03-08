from telebot import types
import telebot

bot = telebot.TeleBot('TOKEN')

allowed_users = ["1005942370", "user2_id", "user3_id"]


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
        return None


@bot.message_handler(commands=['start'])
def start_fun(message):
    bot.send_message(message.chat.id, 'Привет, я бот для проверки телеграмм webapps!)\nЗапустить тестовые страницы можно нажав на кнопки.', parse_mode="Markdown", reply_markup=web_app_keyboard(message.from_user.id))


@bot.message_handler(content_types="text")
def new_mes(message):
    start_fun(message)


@bot.message_handler(content_types=types.ContentType.WEBHOOK_INFO)
def answer(webAppMes):
    print(webAppMes)
    print(webAppMes.web_app_data.data)
    bot.send_message(webAppMes.chat.id, f"получили информацию из веб-приложения: {webAppMes.web_app_data.data}")


if __name__ == '__main__':
    bot.infinity_polling()
