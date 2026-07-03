# Smarta Kokboken – Kom igång! 🍳

Detta projekt är en plattformsoberoende **Progressive Web App (PWA)** som gör matplanering och inköp roligt och enkelt. All din data sparas privat i ditt eget **Google Sheets**-dokument.

## Projektstruktur

Inga byggverktyg krävs – frontend körs som native ES-moduler direkt i webbläsaren.

```
index.html          Enda HTML-sidan, alla vyer och modaler
css/style.css        All styling
js/
  main.js            Startpunkt: initierar allt och binder ihop navigering
  state.js            Globalt state-objekt + konstanter
  dom.js              Cache av DOM-element
  storage.js           Läser/skriver localStorage (config + offline-cache)
  api.js               Kommunikation med Google Apps Script + offline-kö
  router.js            Vyväxling
  utils.js             Delade hjälpfunktioner (bl.a. HTML-escaping)
  views/               En fil per huvudvy (dashboard, tinder, library, shopping, settings)
  modals/               En fil per modal (recipeDetail, recipeForm, dayChooser, quickPantry)
backend/               Google Apps Script-backend, uppdelad per domän (se Steg 1 nedan)
manifest.json, sw.js   PWA-manifest och service worker
```

### Automatisk driftsättning av backend

`backend/`-mappen driftsätts numera automatiskt till Apps Script via [clasp](https://github.com/google/clasp) + GitHub Actions ([.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml)) varje gång något i `backend/` pushas till `main` — inget manuellt kopiera-klistra i webbeditorn behövs längre för framtida ändringar.

Engångsuppsättning (redan gjord för detta repo, men bra att veta):
1. `npm install -g @google/clasp` och `clasp login` lokalt (kräver att Apps Script API är påslaget på `https://script.google.com/home/usersettings`).
2. `.clasp.json` i projektroten pekar ut `scriptId` och `rootDir: "backend"`.
3. Innehållet i den lokala `~/.clasprc.json` (skapas av `clasp login`) sparas som GitHub-hemligheten `CLASPRC_JSON` (`gh secret set CLASPRC_JSON < ~/.clasprc.json`), så GitHub Actions kan autentisera utan att någon känslig nyckel syns i koden.
4. Workflow-filen kör `clasp push` + `clasp deploy --deploymentId <ID på den riktiga distributionen>` vid varje push, vilket uppdaterar samma Webbapps-URL du redan har sparad i appen — ingen ny URL, ingen ny inloggning krävs i appen.

---

## Steg 1: Ställ in Google Sheets (Din Databas)

Appen behöver ett kalkylark på ditt Google-konto för att spara recept, veckoplanering och inköpslistor.

1. Gå till [Google Sheets](https://sheets.google.com) och skapa ett helt **nytt, tomt kalkylark**.
2. Döp kalkylarket till vad du vill (t.ex. `Smarta Kokboken`).
3. Klicka på **Tillägg** (Extensions) -> **Apps Script** i toppmenyn.
4. Radera all eventuell kod som finns i standardfilen (`Code.gs`).
5. Backend-koden ligger uppdelad i flera filer i mappen `backend/` i detta projekt (`Router.js`, `Recipes.js`, `WeeklyPlan.js`, `Pantry.js`, `ShoppingList.js`, `Scraper.js`, `OcrRecipe.js`, `RecipeImage.js`). För varje fil i den mappen:
   - Klicka på **+** bredvid "Filer" i Apps Script-editorn -> **Skript**.
   - Döp den nya filen till samma namn (t.ex. `Router`).
   - Klistra in innehållet från motsvarande fil i `backend/`.
   - Alla filer delar samma globala namnrymd, så ordningen spelar ingen roll.
6. Aktivera Drive-tjänsten (krävs för **Fota recept**-funktionen, se nedan):
   - Klicka på **Tjänster** (Services) **+** i vänstermenyn i Apps Script-editorn.
   - Välj **Drive API** i listan och klicka **Lägg till** (Add). Ingen egen API-nyckel eller betalning krävs, det är en gratis del av ditt Google-konto.
7. Klicka på **Spara**-ikonen (disketten) i Apps Script-menyn.

### Driftsätt som Webbapplikation:
1. Klicka på knappen **Driftsätt** (Deploy) uppe till höger -> välj **Ny distribution** (New deployment).
2. Klicka på kugghjulet bredvid "Välj typ" och välj **Webbapp** (Web app).
3. Ställ in följande:
   - **Beskrivning:** `Smarta Kokboken Engine`
   - **Kör som:** `Mig` (ditt Google-konto)
   - **Vem har åtkomst:** `Alla` (Anyone) - *Viktigt för att din PWA ska kunna kommunicera med arket.*
4. Klicka på **Driftsätt** (Deploy).
5. Du kommer att behöva godkänna behörigheter. Klicka på **Auktorisera åtkomst** (Authorize access), logga in på ditt Google-konto, klicka på **Avancerat** (Advanced) -> **Gå till Smarta Kokboken (osäker)** (Go to Smarta Kokboken) och godkänn.
6. När det är klart visas en ruta med en **Webbapps-URL**. Klicka på **Kopiera** (Copy) och spara denna URL!

---

## Steg 2: Kör appen lokalt

Eftersom projektet är skrivet i ren HTML/CSS/JS behövs inga krångliga byggsteg eller bibliotek:

1. Dubbelklicka på filen `run.bat` i denna projektmapp.
2. Detta kommer starta en lokal server och automatiskt öppna appen i din webbläsare på `http://localhost:8000`.
3. Gå direkt till fliken **Inställningar** (Settings) i appen:
   - Klistra in din **Webbapps-URL** som du kopierade i Steg 1.
   - Öppna ditt Google Sheet i en annan flik. Det har nu skapats en ny flik som heter `Settings`. Kopiera den slumpmässiga textkoden (API-nyckeln) från cell **B1** i kalkylarket och klistra in den i fältet **API-nyckel (Token)** i appen.
   - Klicka på **Testa koppling** för att verifiera att allt lirar, och klicka sedan på **Spara inställningar**.

*Grattis! Din matplanerare är nu fullt ansluten.* 🎉

---

## Steg 3: Installera på mobilen (PWA)

Eftersom appen är en Progressive Web App kan du köra den direkt på din telefon som en vanlig app, helt offline:

### iPhone (Safari):
1. Öppna Safari och gå till din lokala server-IP (t.ex. `http://din-dators-ip:8000`) eller den URL där du har driftsatt appen gratis (t.ex. GitHub Pages eller Vercel).
2. Klicka på **Dela**-knappen (fyrkanten med pil upp).
3. Välj **Lägg till på hemskärmen** (Add to Home Screen).
4. Öppna appen från din hemskärm och klistra in din Webbapps-URL och API-nyckel på inställningssidan.

### Android (Chrome):
1. Öppna Chrome och gå till appens URL.
2. Klicka på de tre punkterna i hörnet.
3. Välj **Installera app** eller **Lägg till på startskärmen**.

**Slippa skriva in URL och API-nyckel manuellt:** Öppna appen på en enhet där den redan är konfigurerad, gå till **Inställningar → Visa QR-kod**, och skanna den med kameran på den nya enheten. Öppnas länken direkt fylls anslutningen i automatiskt utan att du behöver knappa in något.

---

## Hur man använder appen

### 1. Receptinmatning (Dator)
I **Bibliotek** kan du enkelt klistra in länkar från receptsajter (t.ex. ICA, Köket.se, Tasteline) och klicka på **Skrapa**. Appen läser av ingredienser och steg på en sekund. Du kan även skriva in recept manuellt.

**Fota analoga recept:** I samma formulär (knappen "Nytt recept") finns även **Fota recept** — ta en bild av en kokbokssida eller tidningsurklipp direkt med kameran (eller välj en bild från galleriet). Appen läser av texten via Google Drives OCR och gissar vilka rader som är ingredienser respektive instruktioner. Fungerar bäst på tryckt text; en miniatyr av fotot visas i formuläret så du kan jämföra mot originalet medan du rättar eventuella feltolkningar innan du sparar.

**Behöver granskas / formateras:** Kryssrutan under bild-URL-fältet markeras automatiskt efter en foto-avläsning (texten är ofta lite rå direkt från OCR:en). Kryssa i den manuellt för valfritt recept om du vill putsa det senare på en dator istället för att fixa allt på telefonen direkt. Filtret **"Att granska"** i Bibliotek visar bara de recepten, så du hittar dem snabbt igen.

**Ta bild till receptet:** Kamera-knappen bredvid bild-URL-fältet laddar upp en egen bild (t.ex. av den färdiga rätten, eller en skärmbild om en skrapad bild-URL inte fungerar) till en dedikerad mapp i din Google Drive, och sätter den som receptets bild automatiskt.

### 2. Veckoplanering ("Tinder-flödet")
Gå till fliken **Svep** (Tinder). Här kan du snabbt gå igenom dina recept. 
- Svep **höger** (eller klicka på hjärtat) för att planera rätten till en specifik dag.
- Svep **vänster** (eller klicka på krysset) för att hoppa över.
- Du kan även slumpa eller ändra enskilda dagar direkt från **Översikt**-sidan genom att klicka på snurrikonen.

### 3. Inköp i Butiken (Mobil)
Inköpslistan skapas **medvetet**, inte automatiskt live från veckoplanen — det gör att ett recept som råkar vara dåligt formaterat (t.ex. direkt efter foto-avläsning) inte kan smyga in konstiga rader utan att du märker det.
- Klicka **"Bygg inköpslista från veckoplanen"** i fliken **Inköp** när veckans recept är planerade.
- En granskningslista visas med alla ingredienser, förikryssade (basvaror är förikryssade **ur**). Recept märkta "Behöver granskas" visas med en varningsikon på sina rader.
- Bocka **ur** sådant du redan har hemma, klicka sedan **"Skapa lista"** — bara de ikryssade raderna blir den faktiska listan.
- Har en basvara tagit slut efteråt? Tryck på **Slut i skafferiet** och klicka på varan (t.ex. Olivolja) så dyker den upp på listan direkt, utan att du behöver bygga om hela listan.
- I butiken bockar du av varor i realtid. Avbockade varor stryks över direkt.
- Om du tappar täckningen i butiken sparas alla ändringar lokalt i telefonen och synkas automatiskt tillbaka till Google Sheets så fort du får täckning igen.
- När inköpsrundan är klar, klicka på **Slutför**. Då nollställs skafferiflaggorna, avbockningarna och den byggda listan — bygg en ny nästa vecka.
