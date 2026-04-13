# Memory: features/launch/waitlist-onboarding-workflow
Updated: now

A korábbi kétlépcsős várólista (Waitlist) rendszer lecserélésre került közvetlen regisztrációra. Az új folyamat: (1) A főoldalon (HeroSection) egy rövid regisztrációs form (név, email, jelszó) jelenik meg a korábbi waitlist form helyett. (2) A felhasználó regisztrál → email megerősítő link érkezik → megerősítés után beléphet. Nincs Pro trial — mindenki Free tier-en indul. Az Admin Dashboard-ról a Waitlist kezelő panel teljesen eltávolításra került. A waitlist_signups tábla és edge function-ök (waitlist-welcome, admin-sync-data waitlist action) megmaradnak az adatbázisban archívumként, de az UI-ból nem érhetőek el.
