def webAppKeyboard(update):
    # список ID пользователей, которым разрешен доступ к клавиатуре
    allowed_users = [1005942370, 987654321]

    # проверяем, является ли пользователь авторизованным
    if update.effective_user.id not in allowed_users:
        return None

    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)

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

    return keyboard
