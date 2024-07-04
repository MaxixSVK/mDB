import mariadb
from datetime import datetime

db = mariadb.connect(
    host="localhost",
    user="root",
    password="",
    database=""
)

cursor = db.cursor()

data = {}

def insert_series(series_name, img):
    sql = "INSERT INTO Series (seriesName, img) VALUES (%s, %s)"
    val = (series_name, img)
    cursor.execute(sql, val)
    return cursor.lastrowid

def insert_book(series_id, name, startedReading, endedReading):
    sql = "INSERT INTO Books (series_id, name, startedReading, endedReading) VALUES (%s, %s, %s, %s)"
    val = (series_id, name, datetime.strptime(startedReading, "%d.%m.%Y"), datetime.strptime(endedReading, "%d.%m.%Y"))
    cursor.execute(sql, val)
    return cursor.lastrowid

def insert_chapters(book_id, chapters):
    sql = "INSERT INTO Chapters (book_id, name, date) VALUES (%s, %s, %s)"
    for chapter in chapters:
        val = (book_id, chapter['name'], datetime.strptime(chapter['date'], "%d.%m.%Y"))
        cursor.execute(sql, val)


series_id = insert_series(data['seriesName'], data['img'])

for book in data['books']:
    book_id = insert_book(series_id, book['name'], book['startedReading'], book['endedReading'])
    insert_chapters(book_id, book['chapters'])

db.commit()

cursor.close()
db.close()