# iobroker.occ

## Dokumentation

Der Adapter Object Control Calendar (kurz iobroker.occ) ist ein Webkalender auf Basis fullcalendar (http://www.fullcalendar.io).
Mit dem Kalender werden Homematic Thermostaten, Homematic Funk-Releais und MAX! Thermostaten zeitlich gesteuert.

### Installation

* iobroker.occ wird mittels npm install iobroker.occ im Root Verzeichnis des ioBroker installiert.
* In diesem Zuge wird der fullcalendar heruntergeladen.
* Der Adapter hat den web Adapter als Abhängigkeit.

### Konfiguration

Derzeit existieren noch keine Einstellungen.

### Anwendung

Der Adapter wird über den web Adapter zur Verfügung gestellt und kann dann mittels
http://%ip%:%web_port%/occ/index.html aufgerufen werden.

## Todo

* Doku, Doku, Doku
* Übersetzung
* Umbau von HTML-Prototyp zu integriertem Adapter mit Steuerung

## Changelog

### 0.0.4
* (husky-koglhof) add Dependencies for automatic Installation

### 0.0.1
* (husky-koglhof) HTML Prototyp

## Lizenz

Copyright (c) 2015 husky-koglhof

[CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/)


Der obige Urheberrechtsvermerk ist in allen Kopien oder Teilkopien der Software beizulegen.

DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT, EINSCHLIESSLICH DER GARANTIE ZUR BENUTZUNG FÜR DEN VORGESEHENEN ODER EINEM BESTIMMTEN ZWECK SOWIE JEGLICHER RECHTSVERLETZUNG, JEDOCH NICHT DARAUF BESCHRÄNKT. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHTINHABER FÜR JEGLICHEN SCHADEN ODER SONSTIGE ANSPRÜCHE HAFTBAR ZU MACHEN, OB INFOLGE DER ERFÜLLUNG EINES VERTRAGES, EINES DELIKTES ODER ANDERS IM ZUSAMMENHANG MIT DER SOFTWARE ODER SONSTIGER VERWENDUNG DER SOFTWARE ENTSTANDEN.

HomeMatic und BidCoS sind eingetragene Warenzeichen der [eQ-3 AG](http://eq-3.de)
