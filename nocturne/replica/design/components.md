# Components: Nocturne

Tokens: `tokens.json` (mirrored in `app/globals.css` `@theme`). Contrast: `contrast-report.txt`, 19 pairs, 0 AA failures.
Icons: lucide-react. Font: Figtree (OFL), bundled from npm. All copy written fresh.
Primitives live in `components/ui/`, media parts in `components/media/`, player parts in `components/player/`.

```
Button (components/ui/Button.tsx)
  variants  primary (accent), light, secondary (outline), ghost, danger
  sizes     sm 32px, md 40px, lg 48px; pill radius
  states    default, hover (scale 1.02), active (scale .97), focus-visible (2px focus ring), disabled, loading (spinner, aria-busy)
  a11y      real <button>; loading keeps the label

IconButton / ToggleIcon (Button.tsx, player/Controls.tsx)
  sizes     32, 40, 48
  states    default, hover, pressed (accent + dot, aria-pressed), disabled
  a11y      label required (aria-label + title)

PlayContextButton (player/PlayContextButton.tsx)
  sizes     sm 40, md 48, lg 56; accent circle
  states    play, pause (when its context is playing), loading (fetching tracks)
  used on   cards, headers, top result

MediaCard / AlbumCard / ArtistCard / PlaylistCard (media/MediaCard.tsx, Cards.tsx)
  variants  square art, round art (artist)
  states    default, hover/focus-within (surface-2, play button rises), touch (play button always shown)
  a11y      title is the link; the whole card is clickable through a stretched link; play button sits above it

ShortcutTile (media/ShortcutTile.tsx)  wide quick-access tile on Home, play on hover (lg+)

Shelf (media/Shelf.tsx)
  horizontal scroller with snap, scroll buttons (md+, disabled at the ends), optional "Show all"
  a11y      <section aria-labelledby>

TrackList (media/TrackList.tsx)
  columns   # / title+artist / album (md+) / added|liked|played or plays (md/lg+) / like, duration, more
  states    default, hover (number -> play), playing (accent title + equaliser), focus-visible ring, dragging, drop target
  input     double-click or Enter plays; tap plays on touch; right-click, Shift+F10 or the menu key opens the menu;
            drag-and-drop reorder for playlist owners (Move up/down in the menu for keyboard and touch)
  a11y      role=table/row/cell, row is focusable

Menu (ui/Menu.tsx)
  one host for track, playlist, album and account menus; nested panel for "Add to playlist" with a back item
  keyboard  arrows, Home/End, Enter, Escape (closes or goes back), Tab closes; focus returns to the trigger

Dialog (ui/Dialog.tsx)   native <dialog> (focus trap, Escape, inert background); edit details, delete confirm, profile
Toaster (ui/Toaster.tsx) aria-live polite; info and error tones; optional link or Undo action
Skeleton, EmptyState, Equalizer (ui/Feedback.tsx)

PlayerBar (player/PlayerBar.tsx, desktop)
  now playing (art, title, artist, like) / transport (shuffle, previous, play-pause, next, repeat off/all/one) + seek bar with times / queue, mute, volume
  states    empty ("Pick something to play"), loading/buffering (spinner), playing, paused, error (message in place of the artist)
MiniPlayer + FullPlayer (phones)  mini bar above the tab bar with progress line; full-screen sheet with big art, seek, transport, volume, queue

SeekBar / VolumeControl (player/Controls.tsx)
  native range inputs styled with --pct; drag previews and commits on release; arrows seek 5 s / change volume 5%
  a11y      aria-label + aria-valuetext ("0:42 of 1:25", "25%")

Sidebar (shell/Sidebar.tsx)  300px at lg, 76px icon rail at md, hidden on phones; library filters; signed-out prompts
TopBar (shell/TopBar.tsx)    back/forward, search field ("/" focuses it), account menu or Sign up / Log in; turns solid on scroll
MobileNav (shell/MobileNav.tsx) four tabs: Home, Search, Your Library, Profile/Log in
DetailHeader (media/DetailHeader.tsx) tinted gradient from the artwork's genre colour, art, kind, title (size by length), meta
```
