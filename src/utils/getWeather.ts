import { WeatherStatus } from '@/app/actions';
import axios from 'axios';

function getWeatherCategory(condition: string): WeatherStatus {
    let weather: WeatherStatus = "기타";
    if (condition.includes('흐')) {
        weather = "흐림";
    }
    if (condition.includes('구름')) {
        if (condition.includes('조')) {
            weather = "구름조금";
        } else {
            weather = "구름많음";
        }
    }
    if (condition.includes('맑')) {
        weather = "맑음";
    }
    if (condition.includes('소나기')) {
        weather = "소나기";
    }
    if (condition.includes('비')) {
        weather = "비";
    }
    if (condition.includes('눈')) {
        weather = "눈";
    }
    return weather;
}

export async function getNaverWeeklyWeather(): Promise<any> {
    const baseUrl = "https://weather.naver.com/today/04113122?cpName=KMA";
    const response = await axios.get(baseUrl);
    const match = response.data.match(/"domesticWeeklyFcastList":\s*(\[[^\]]*\])/);
    const domesticWeeklyFcastList = JSON.parse(match[1]);

    const pattern = /"nowSynthesisFcast~~1":\s*({.*?})\s*(,|$)/;
    const jsonMatch = response.data.match(pattern);
    const jsonData = jsonMatch[1];
    const todayWeather = JSON.parse(jsonData + "}");

    const output: any[] = [];
    const currentTime = new Date();
    const windList = await getDailyForecast();
    const windValues = Object.values(windList).map((value: any) => value['avg_wind']);

    domesticWeeklyFcastList.slice(0, 6).forEach((item: any, index: number) => {
        // YYYYMMDD 형식을 YYYY-MM-DD로 변환
        const aplYmd = item['aplYmd'];
        const formattedAplYmd = `${aplYmd.substring(0, 4)}-${aplYmd.substring(4, 6)}-${aplYmd.substring(6, 8)}`;
        const date = new Date(formattedAplYmd);
        const formattedDate = `${date.getDate()}일(${item['dayString']})`;

        const minTemp = Math.floor(item['minTmpr'] * 10) / 10;
        const maxTemp = Math.floor(item['maxTmpr'] * 10) / 10;

        const status = `${item['amWetrTxt']} / ${item['pmWetrTxt']}`;
        const amStatus = status.split(" / ")[0]
        const pmStatus = status.split(" / ")[1];
        const hu = currentTime.getHours() < 12 ? item['amRainProb'] : item['pmRainProb'];
        const wind = Math.round(windValues[index]);

        output.push({
            date: formattedDate,
            temp: {
                minTemp,
                maxTemp
            },
            hu,
            wind,
            status: {
                am: getWeatherCategory(amStatus),
                pm: getWeatherCategory(pmStatus)
            }
        });
    });

    output[0]["temp"]["curTemp"] = (Math.round(todayWeather['nowFcast']["tmpr"] * 10) / 10);
    output[0]["wind"] = Math.round(todayWeather['nowFcast']["windSpd"]);
    output[0]["status"]["cur"] = getWeatherCategory(todayWeather['nowFcast']["wetrTxt"]);
    return output;
}

const API_KEY = "629f45cbcec5cd5b0a1855b63d015b7d";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

async function getDailyForecast(): Promise<any> {
    const params = {
        q: "Seoul",
        appid: API_KEY,
        units: "metric",
        lang: "kr"
    };

    try {
        const response = await axios.get(FORECAST_URL, { params });
        const forecastData = response.data;
        const dailyForecast: any = {};

        forecastData.list.forEach((entry: any) => {
            const date = new Date(entry.dt * 1000).toISOString().split("T")[0];
            if (!dailyForecast[date]) {
                dailyForecast[date] = {
                    temp_sum: 0,
                    humidity_sum: 0,
                    wind_sum: 0,
                    count: 0,
                    description: entry.weather[0].description
                };
            }
            dailyForecast[date]["temp_sum"] += entry.main.temp;
            dailyForecast[date]["humidity_sum"] += entry.main.humidity;
            dailyForecast[date]["wind_sum"] += entry.wind.speed;
            dailyForecast[date]["count"] += 1;
        });

        Object.keys(dailyForecast).forEach((date) => {
            const data = dailyForecast[date];
            data["avg_temp"] = Math.round(data["temp_sum"] / data["count"]);
            data["avg_humidity"] = Math.round(data["humidity_sum"] / data["count"]);
            data["avg_wind"] = Math.round(data["wind_sum"] / data["count"]);
        });

        return dailyForecast;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}

// getNaverWeeklyWeather().then((weeklyWeather) => {
//     console.log(weeklyWeather);
// });
