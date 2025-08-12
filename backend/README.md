So we are using Gemini API key to mimic the API information. (If someone finds a free OpenAI key plz change the code in the server.js)

When cloned in your local, make sure you install the modules, create a .env file
with PORT of your choice and a variable named GEMINI_API_URL. 
Make sure you name it like this else the code does not work. **  GEMINI_API_URL **

Create your API key here https://aistudio.google.com/app/apikey 

https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOURAPIKEY

/prompt works the same, but instead of string we will get an array of places.

/temp will give the current tempearture of the recommendation array if empty body is passed in the body {}, but also gives custom city temperature if you pass {"cities" : ["Your_City_name"]} 

backend has a global variable that is passed to the /temp by default. 
if you call /temp before invoking /prompt it won't work.

For better understanding, send a city name as an input (body) to /prompt like you used to.
Then hit /temp with an empty body {}. You will get the temperatures.

if you want a specific city's temperature you can pass {"cities" : [Your_CITY_name]} as the body for /temp


*** /transport is not working for some reason***
DO NOT USE THAT.
hit /prompt with a body like this 

{
    "city": "Bangalore",
    "start_date": "15/08/25",
    "end_date": "18/08/25"
}

then hit /temp with the same body 
and then /finalTrip.
