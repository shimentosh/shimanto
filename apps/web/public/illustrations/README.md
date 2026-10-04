# Illustration slots

Placeholder art is drawn in code (`packages/ui/src/components/art/spot.tsx`: `Spot`, `DeskScene`; shared by the site, admin and customer portal) in the brand style:
flat objects in the five world colours with thin ink lines. Preview every slot at
`/design-system/art`. When commissioned SVG/Rive art arrives, replace the matching entry; the
slot's aspect ratio is what the layout expects.

| Slot (`Spot name`) | Where it appears                              | Aspect / size        |
| ------------------ | --------------------------------------------- | -------------------- |
| `DeskScene`        | Home hero (right column)                      | 480×400, ~560px wide |
| `hello`            | Home "Why this site exists", About header     | 240×200, ~320px      |
| `calendar`         | Home "Now", Now header, Wins empty state      | 240×200              |
| `rocket`           | Work header                                   | 240×200              |
| `package`          | Products header, Resources empty state        | 240×200              |
| `notebook`         | Blog header                                   | 240×200              |
| `clipboard`        | Playbooks header                              | 240×200              |
| `bulb`             | Experiments header, Exploring empty state     | 240×200              |
| `toolbox`          | Resources header, default empty state         | 240×200              |
| `flask`            | Marketing Lab header, Experiments empty state | 240×200              |
| `trophy`           | Wall of Wins header                           | 240×200              |
| `guitar`           | Creative Archive header, Personal empty state | 240×200              |
| `megaphone`        | Social header, Lab and Featured empty states  | 240×200              |
| `orbit`            | Skills Galaxy header                          | 240×200              |
| `magnifier`        | Currently exploring header                    | 240×200              |
| `coffee`           | Personal side header                          | 240×200              |
| `mic`              | Featured header, Creative empty state         | 240×200              |
| `plane`            | Collaborate header                            | 240×200              |
| `cone`             | 404 page                                      | 240×200              |
| `mail`             | Checkout success                              | 240×200              |

Blog covers and product art are generated from the post category / product kind and don't need
files. An uploaded product cover in the admin replaces the generated product art automatically.
