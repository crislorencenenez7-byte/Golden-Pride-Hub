# Golden Pride Hub 4.3

## Release highlights
- New black/gold visual refresh optimized for mobile.
- Separate Admin Control Center with dedicated tabs for broadcasts, announcements, events, members, gallery and achievements.
- Admin can type any custom Live Broadcast message.
- Live messages appear upper-center on Home (`index.html`) and Dashboard, plus the live message feed.
- Fixed malformed stylesheet markup on Home and corrected notification icon path.
- Version/update metadata set to 4.3.

## Firebase
Keep your existing Firebase configuration. If your current Firestore rules already contain the broadcast rules, keep them. Otherwise merge the broadcast rules from `FIRESTORE_RULES_V5.2_BROADCAST.txt` into your existing rules rather than replacing the whole ruleset.

## Version 4.3 final fixes
- Global realtime admin broadcasts appear in the upper-center on every Hub page/tab.
- Home (`index.html`) announcement preview now loads independently of authentication.
- Announcement preview has a local-sort fallback for older Firestore data/index states.
- Service-worker cache was bumped so updated JavaScript is fetched.
- Use `FIRESTORE_RULES_V4.3_FINAL.txt` for the complete Firestore rules.
