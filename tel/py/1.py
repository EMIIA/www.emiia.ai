import telegram
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters

# список ID пользователей, которым разрешен доступ к боту
allowed_users = [123456789, 987654321]

def start(update, context):
    # проверяем, является ли пользователь авторизованным
    if update.message.chat_id in allowed_users:
        context.bot.send_message(chat_id=update.effective_chat.id, text="Добро пожаловать! Я бот.")
    else:
        context.bot.send_message(chat_id=update.effective_chat.id, text="У вас нет доступа к этому боту.")

def main():
    # создаем экземпляр бота и передаем ему токен
    updater = Updater(token='YOUR_TOKEN_HERE', use_context=True)

    # создаем обработчик команды /start
    start_handler = CommandHandler('start', start)

    # добавляем обработчики команд и сообщений в бота
    updater.dispatcher.add_handler(start_handler)

    # запускаем бота
    updater.start_polling()

    # останавливаем бота при нажатии Ctrl-C
    updater.idle()

if __name__ == '__main__':
    main()

    
    
    
    
    
    
В этом примере мы определяем список allowed_users, который содержит ID пользователей, которым разрешен доступ к боту. Затем мы создаем обработчик команды /start, который проверяет, есть ли ID пользователя в списке allowed_users. Если ID пользователя присутствует в списке, то бот отправляет сообщение приветствия, а если нет, то отправляет сообщение об ошибке.

Вы можете изменить список allowed_users, чтобы добавить или удалить пользователей, которым разрешен доступ к боту.
