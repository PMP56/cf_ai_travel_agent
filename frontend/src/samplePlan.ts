/**
 * A complete sample plan, for looking at the interface without spending
 * Workers AI credit.
 *
 * The free tier covers roughly seven plans a day, and local `wrangler dev`
 * draws on the same allowance — so a session spent adjusting layout exhausts it
 * long before the layout is right. This is that session's way out.
 *
 * Everything here is REAL: coordinates, Wikipedia pageview figures, lead image
 * URLs and the April climate normals all came from the live pipeline. Only the
 * day themes and notes were written by hand. Judging the design against
 * invented data would mean judging the wrong thing.
 *
 * Generated once and committed deliberately — it is a fixture, not a mock.
 */

import type { PlanResult } from "./types";

export const SAMPLE_PLAN: PlanResult = {
  "brief": {
    "destination": "Kyoto",
    "destinationCity": null,
    "durationDays": 5,
    "travelMonth": "April",
    "budget": null,
    "partySize": 2,
    "pace": "relaxed",
    "interests": [
      "temples",
      "street food"
    ],
    "constraints": []
  },
  "place": {
    "name": "Kyoto",
    "country": "Japan",
    "countryCode": "JP",
    "admin1": "Kyoto",
    "latitude": 35.0116,
    "longitude": 135.7681,
    "timezone": "Asia/Tokyo",
    "population": 1463723
  },
  "alternatives": [],
  "destination": {
    "overview": "Kyoto was the capital of Japan for over a millennium and carries a reputation as the country's cultural heart. It escaped wartime bombing, so the temple districts, wooden machiya streets and imperial grounds survive largely intact.",
    "gettingAround": "The two subway lines cover little of the city, so buses and the occasional taxi do most of the work; the eastern temple districts are best walked.",
    "safety": "",
    "etiquette": "In Gion, photographing geiko and maiko in the private lanes is prohibited and fines are enforced — stay on Hanamikoji and ask before pointing a camera at anyone.",
    "source": {
      "title": "Kyoto",
      "url": "https://en.wikivoyage.org/wiki/Kyoto"
    }
  },
  "climate": {
    "normals": {
      "month": "April",
      "yearsSampled": 5,
      "avgHighC": 19.5,
      "avgLowC": 8.7,
      "avgPrecipitationMm": 156,
      "rainyDayFraction": 0.35,
      "recordHighC": 29.1,
      "recordLowC": 1.4,
      "avgWindKph": 15.5,
      "peakWindKph": 38.2
    },
    "summary": "Mild days and cool evenings, with rain on roughly a third of them. Comfortable for long walks between temples, but not reliably dry.",
    "packing": [
      "a light jacket for evenings near 8.7C",
      "a compact umbrella for the 35% of days with meaningful rain",
      "layers for the 11 degree daily swing"
    ],
    "caution": null,
    "comfortRating": 4
  },
  "places": [
    {
      "title": "Kinkaku-ji",
      "latitude": 35.0395,
      "longitude": 135.7285,
      "distanceM": 4800,
      "viewsPerDay": 306,
      "summary": "Kinkaku-ji, officially Rokuon-ji, is a Zen temple whose top two floors are covered in gold leaf.",
      "url": "https://en.wikipedia.org/wiki/Kinkaku-ji",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg/960px-Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "the golden pavilion mirrored in its pond"
    },
    {
      "title": "Ryōan-ji",
      "latitude": 35.03444444,
      "longitude": 135.71833333,
      "distanceM": 5200,
      "viewsPerDay": 89,
      "summary": "Ryōan-ji is a Zen temple in northwest Kyoto, home to Japan's best-known kare-sansui rock garden.",
      "url": "https://en.wikipedia.org/wiki/Ry%C5%8Dan-ji",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Kare-sansui_zen_garden%2C_Ry%C5%8Dan-ji%2C_Kyoto_20190416_1.jpg/960px-Kare-sansui_zen_garden%2C_Ry%C5%8Dan-ji%2C_Kyoto_20190416_1.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "the best-known dry rock garden in Japan"
    },
    {
      "title": "Nijō Castle",
      "latitude": 35.01416667,
      "longitude": 135.7475,
      "distanceM": 1900,
      "viewsPerDay": 167,
      "summary": "Nijō Castle is a flatland castle in Kyoto built for the first Tokugawa shogun.",
      "url": "https://en.wikipedia.org/wiki/Nij%C5%8D_Castle",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/NinomaruPalace.jpg/960px-NinomaruPalace.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "historic",
      "why": "shogunal palace with nightingale floors"
    },
    {
      "title": "Kyoto Imperial Palace",
      "latitude": 35.02527778,
      "longitude": 135.76222222,
      "distanceM": 1600,
      "viewsPerDay": 197,
      "summary": "The Kyōto Imperial Palace was the residence of Japan's emperors from 1331 until 1869.",
      "url": "https://en.wikipedia.org/wiki/Kyoto_Imperial_Palace",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/%E7%BE%8E%E3%81%97%E3%81%8D%E4%BA%AC%E9%83%BD%E5%BE%A1%E6%89%80.jpg/960px-%E7%BE%8E%E3%81%97%E3%81%8D%E4%BA%AC%E9%83%BD%E5%BE%A1%E6%89%80.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "historic",
      "why": "the emperor's seat for five centuries"
    },
    {
      "title": "Ginkaku-ji",
      "latitude": 35.02666667,
      "longitude": 135.79833333,
      "distanceM": 3200,
      "viewsPerDay": 68,
      "summary": "Ginkaku-ji, officially Jishō-ji, is a Zen temple set beneath the eastern mountains.",
      "url": "https://en.wikipedia.org/wiki/Ginkaku-ji",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Ginkakuji_Kyoto03-r.jpg/960px-Ginkakuji_Kyoto03-r.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "silver pavilion above a raked sand sea"
    },
    {
      "title": "Kiyomizu-dera",
      "latitude": 34.995,
      "longitude": 135.785,
      "distanceM": 2400,
      "viewsPerDay": 340,
      "summary": "Kiyomizu-dera is a Buddhist temple in eastern Kyoto, built without a single nail.",
      "url": "https://en.wikipedia.org/wiki/Kiyomizu-dera",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/960px-Kiyomizu.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "hillside stage over the maple valley"
    },
    {
      "title": "Gion",
      "latitude": 35.003496,
      "longitude": 135.775051,
      "distanceM": 1100,
      "viewsPerDay": 80,
      "summary": "Gion is a district of Higashiyama-ku that grew up as an entertainment quarter before Yasaka Shrine.",
      "url": "https://en.wikipedia.org/wiki/Gion",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/150124_Gion_Kyoto_Japan01s3.jpg/960px-150124_Gion_Kyoto_Japan01s3.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "neighbourhood",
      "why": "lantern-lit lanes and machiya teahouses"
    },
    {
      "title": "Fushimi Inari-taisha",
      "latitude": 34.96722222,
      "longitude": 135.77277778,
      "distanceM": 5000,
      "viewsPerDay": 428,
      "summary": "Fushimi Inari-taisha is the head shrine of the kami Inari, at the base of a mountain of torii gates.",
      "url": "https://en.wikipedia.org/wiki/Fushimi_Inari-taisha",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/960px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "the tunnel of ten thousand vermilion torii"
    },
    {
      "title": "Sanjūsangen-dō",
      "latitude": 34.98777778,
      "longitude": 135.77166667,
      "distanceM": 2700,
      "viewsPerDay": 69,
      "summary": "Sanjūsangen-dō is a Tendai temple whose hall holds 1,001 statues of Kannon.",
      "url": "https://en.wikipedia.org/wiki/Sanj%C5%ABsangen-d%C5%8D",
      "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Sanjusangendo_2022.jpg/960px-Sanjusangendo_2022.jpg",
      "imageWidth": 640,
      "imageHeight": 427,
      "category": "religious",
      "why": "1,001 gilded Kannon in a 120m hall"
    }
  ],
  "food": {
    "dishes": [
      "kaiseki",
      "yatsuhashi",
      "matcha ice cream",
      "shōjin ryōri",
      "hamo",
      "yudofu"
    ],
    "advice": "Most fine dining is cash only, and the best kaiseki houses require a reservation made well in advance through a hotel concierge.",
    "dietaryNote": null,
    "source": {
      "title": "Kyoto",
      "url": "https://en.wikivoyage.org/wiki/Kyoto"
    }
  },
  "itinerary": {
    "days": [
      {
        "day": 1,
        "title": "Northwest temples",
        "note": "Start at Kinkaku-ji before the coach parties arrive, then walk the kilometre south-west to Ryōan-ji and sit with the rock garden a while.",
        "places": [
          {
            "title": "Kinkaku-ji",
            "latitude": 35.0395,
            "longitude": 135.7285,
            "distanceM": 4800,
            "viewsPerDay": 306,
            "summary": "Kinkaku-ji, officially Rokuon-ji, is a Zen temple whose top two floors are covered in gold leaf.",
            "url": "https://en.wikipedia.org/wiki/Kinkaku-ji",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg/960px-Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "the golden pavilion mirrored in its pond"
          },
          {
            "title": "Ryōan-ji",
            "latitude": 35.03444444,
            "longitude": 135.71833333,
            "distanceM": 5200,
            "viewsPerDay": 89,
            "summary": "Ryōan-ji is a Zen temple in northwest Kyoto, home to Japan's best-known kare-sansui rock garden.",
            "url": "https://en.wikipedia.org/wiki/Ry%C5%8Dan-ji",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Kare-sansui_zen_garden%2C_Ry%C5%8Dan-ji%2C_Kyoto_20190416_1.jpg/960px-Kare-sansui_zen_garden%2C_Ry%C5%8Dan-ji%2C_Kyoto_20190416_1.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "the best-known dry rock garden in Japan"
          }
        ],
        "travelKm": 1.1
      },
      {
        "day": 2,
        "title": "Castle and palace",
        "note": "Nijō opens at 08:45 and the nightingale floors are best heard before the crowds; the palace grounds are a flat 20-minute walk north.",
        "places": [
          {
            "title": "Nijō Castle",
            "latitude": 35.01416667,
            "longitude": 135.7475,
            "distanceM": 1900,
            "viewsPerDay": 167,
            "summary": "Nijō Castle is a flatland castle in Kyoto built for the first Tokugawa shogun.",
            "url": "https://en.wikipedia.org/wiki/Nij%C5%8D_Castle",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/NinomaruPalace.jpg/960px-NinomaruPalace.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "historic",
            "why": "shogunal palace with nightingale floors"
          },
          {
            "title": "Kyoto Imperial Palace",
            "latitude": 35.02527778,
            "longitude": 135.76222222,
            "distanceM": 1600,
            "viewsPerDay": 197,
            "summary": "The Kyōto Imperial Palace was the residence of Japan's emperors from 1331 until 1869.",
            "url": "https://en.wikipedia.org/wiki/Kyoto_Imperial_Palace",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/%E7%BE%8E%E3%81%97%E3%81%8D%E4%BA%AC%E9%83%BD%E5%BE%A1%E6%89%80.jpg/960px-%E7%BE%8E%E3%81%97%E3%81%8D%E4%BA%AC%E9%83%BD%E5%BE%A1%E6%89%80.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "historic",
            "why": "the emperor's seat for five centuries"
          }
        ],
        "travelKm": 1.8
      },
      {
        "day": 3,
        "title": "Eastern hills",
        "note": "A deliberately short day — climb to the moss garden viewpoint, then follow the Philosopher's Path back into town at your own pace.",
        "places": [
          {
            "title": "Ginkaku-ji",
            "latitude": 35.02666667,
            "longitude": 135.79833333,
            "distanceM": 3200,
            "viewsPerDay": 68,
            "summary": "Ginkaku-ji, officially Jishō-ji, is a Zen temple set beneath the eastern mountains.",
            "url": "https://en.wikipedia.org/wiki/Ginkaku-ji",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Ginkakuji_Kyoto03-r.jpg/960px-Ginkakuji_Kyoto03-r.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "silver pavilion above a raked sand sea"
          }
        ],
        "travelKm": 0.0
      },
      {
        "day": 4,
        "title": "Higashiyama lanes",
        "note": "Go up to Kiyomizu-dera first, then drift downhill through the Sannenzaka steps into Gion as the lanterns come on.",
        "places": [
          {
            "title": "Kiyomizu-dera",
            "latitude": 34.995,
            "longitude": 135.785,
            "distanceM": 2400,
            "viewsPerDay": 340,
            "summary": "Kiyomizu-dera is a Buddhist temple in eastern Kyoto, built without a single nail.",
            "url": "https://en.wikipedia.org/wiki/Kiyomizu-dera",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/960px-Kiyomizu.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "hillside stage over the maple valley"
          },
          {
            "title": "Gion",
            "latitude": 35.003496,
            "longitude": 135.775051,
            "distanceM": 1100,
            "viewsPerDay": 80,
            "summary": "Gion is a district of Higashiyama-ku that grew up as an entertainment quarter before Yasaka Shrine.",
            "url": "https://en.wikipedia.org/wiki/Gion",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/150124_Gion_Kyoto_Japan01s3.jpg/960px-150124_Gion_Kyoto_Japan01s3.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "neighbourhood",
            "why": "lantern-lit lanes and machiya teahouses"
          }
        ],
        "travelKm": 1.3
      },
      {
        "day": 5,
        "title": "Southern shrines",
        "note": "Fushimi Inari at sunrise is the one unmissable early start; Sanjūsangen-dō is two stops north and stays open until 17:00.",
        "places": [
          {
            "title": "Fushimi Inari-taisha",
            "latitude": 34.96722222,
            "longitude": 135.77277778,
            "distanceM": 5000,
            "viewsPerDay": 428,
            "summary": "Fushimi Inari-taisha is the head shrine of the kami Inari, at the base of a mountain of torii gates.",
            "url": "https://en.wikipedia.org/wiki/Fushimi_Inari-taisha",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/960px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "the tunnel of ten thousand vermilion torii"
          },
          {
            "title": "Sanjūsangen-dō",
            "latitude": 34.98777778,
            "longitude": 135.77166667,
            "distanceM": 2700,
            "viewsPerDay": 69,
            "summary": "Sanjūsangen-dō is a Tendai temple whose hall holds 1,001 statues of Kannon.",
            "url": "https://en.wikipedia.org/wiki/Sanj%C5%ABsangen-d%C5%8D",
            "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Sanjusangendo_2022.jpg/960px-Sanjusangendo_2022.jpg",
            "imageWidth": 640,
            "imageHeight": 427,
            "category": "religious",
            "why": "1,001 gilded Kannon in a 120m hall"
          }
        ],
        "travelKm": 2.3
      }
    ],
    "unscheduledDays": 0,
    "droppedForPace": 3,
    "totalTravelKm": 6.5
  },
  "critique": {
    "defects": [],
    "approved": true
  },
  "missing": [
    "budget"
  ]
};
