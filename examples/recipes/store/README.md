# store — Northline Supply

A catalogue and checkout for an invented shop, built only with the published iVOLT
package (`../ivolt/css/ivolt.min.css` and `../ivolt/js/auto.js`) plus one local
stylesheet for the layout of this page.

## What it demonstrates

| Area | Components |
| --- | --- |
| Frame | `iv-navbar` with the early `data-iv-js` mark (ADR-042), `iv-breadcrumb` |
| Product | `iv-carousel--contained` with `data-iv-effect="fade"`, dots and controls; `iv-badge`; `iv-stat` for the price and the capacity |
| Catalogue | `iv-picker` over a native `<select>`, `iv-combobox` over a `<datalist>`, `iv-card` with `iv-elevate` and photographs, `iv-pagination` |
| Basket | `iv-drawer` on the end side with two invented lines and an `iv-alert`, and an `iv-dialog` confirmation that only shows a declarative `iv-toast` |
| Checkout | `iv-stepper` inside `iv-form`, `iv-picker`, `iv-datepicker` with `data-iv-native="off"`, required checkbox, field-level error messages |
| Theme | a three-button group in the footer that calls the `theme` module of the package |

## What is fictional

Northline Supply is not a shop. Every product name, specification, price, stock level
and delivery promise is invented and marked as an example price on the page itself.
Nothing can be bought: there is no card form, no payment provider, no stock and no
order. The basket is two lines written into the HTML, the confirmation dialog states
that it takes nothing, the filters keep their value and change nothing (there is no
catalogue behind them to filter), the pagination links return to the top of the
section, and the three-step checkout validates in the browser and ends with a disabled
button that says there is nothing to order.

**About the product photographs.** The Halden brewer does not exist, so no photograph
of it can exist either. The four frames in the carousel are stock photographs of
similar objects and of a shop; each caption says what is actually in the frame and who
made it, and the page states that they are not four views of one product.

## Photographs

Source: Lorem Picsum (`https://picsum.photos/id/<id>/<width>/<height>`), which serves
photographs published on Unsplash under the Unsplash License (free to use, no
permission needed; attribution appreciated). The carousel uses 1280×800 copies and the
cards and basket use 800×500 copies. There are no photographs of people. The npm
package ships no bitmaps.

| File | What it shows | Author | Unsplash page |
| --- | --- | --- | --- |
| `p225.jpg`, `p225-800.jpg` | A glass teapot with a steel plunger, a cup and yellow roses | Vee O | https://unsplash.com/photos/hGO27G5tZJ8 |
| `p1060.jpg`, `p1060-800.jpg` | A kettle pouring into a filter over a glass carafe | Karl Fredrickson | https://unsplash.com/photos/TYIzeCiZ_60 |
| `p431.jpg`, `p431-800.jpg` | A cappuccino beside a brass bell and paper receipts | Carli Jean | https://unsplash.com/photos/UWRqlJcDCXA |
| `p1059.jpg` | A shop interior in pale wood with a jacket on a hanger | Clark Street Mercantile | https://unsplash.com/photos/vC-GqGbakJo |
| `p292-800.jpg` | A halved red onion and root vegetables on a board | Webvilla | https://unsplash.com/photos/hv1MrBzGGNY |
| `p326-800.jpg` | A hand beside a bowl of lemon and ginger in water | Dominik Martin | https://unsplash.com/photos/JYFmYif4n70 |
| `p535-800.jpg` | A rail of folded shirts on wooden hangers | Jeff Sheldon | https://unsplash.com/photos/Lj1S1_KD61k |
