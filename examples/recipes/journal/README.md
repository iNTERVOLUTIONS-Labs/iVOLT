# journal — The Quiet Column

An editorial issue for an invented journal, light by default, built only with the
published iVOLT package (`../ivolt/css/ivolt.min.css` and `../ivolt/js/auto.js`) plus
one local stylesheet for the layout, the drop cap and the print sheet.

## What it demonstrates

| Area | Components |
| --- | --- |
| Frame | `iv-navbar` with the early `data-iv-js` mark (ADR-042), `iv-scroll-progress` as the reading position, `iv-breadcrumb` |
| Cover | a typographic masthead with `iv-gradient-text`, a `<picture>` plate and a caption |
| Reading | a 66-character column, a drop cap and a pull quote from the local stylesheet; two notes as native `iv-popover` panels opened by words in the text (they work without JavaScript) |
| Plates | `iv-gallery--masonry` with `Lightbox`, five photographs at their own heights |
| Index | a rule-separated list of the six invented pieces and `iv-pagination` for the issues |
| Print | a print stylesheet that drops the bar, the plates and the pagination and sets the column to the paper |
| Theme | a three-button group in the footer that calls the `theme` module of the package |

## What is fictional

The Quiet Column is not a journal. The issue number, the six articles, the byline, the
reading times and the quotation in the pull quote are invented, and the quotation is
attributed to nobody on purpose. Every index entry and every pagination link returns to
a section of this page: there is no archive and there are no other pages. Nothing is
sold and there is no subscription.

## Photographs

Source: Lorem Picsum (`https://picsum.photos/id/<id>/<width>/<height>`), which serves
photographs published on Unsplash under the Unsplash License (free to use, no
permission needed; attribution appreciated). The plates are requested at their own
aspect ratios so the masonry column has something to work with. There are no
photographs of people. The npm package ships no bitmaps.

| File | What it shows | Author | Unsplash page |
| --- | --- | --- | --- |
| `p1073.jpg`, `p1073-800.jpg` | Dozens of open books laid face down | Patrick Tomasso | https://unsplash.com/photos/Oaqk7qqNh_c |
| `p1045.jpg` | A rocky ridge swallowed by low cloud | Aleksandra Boguslawska | https://unsplash.com/photos/USOu_Ob9rxo |
| `p1042.jpg` | Star trails spiralling over a dark silhouette | Jeremy Thomas | https://unsplash.com/photos/rMmibFe4czY |
| `p1057.jpg` | A wooded coast dropping to a calm sea | Stefan Kunze | https://unsplash.com/photos/_SmZSuZwkHg |
| `p1070.jpg` | The interior of an abandoned turquoise car | Sean Stratton | https://unsplash.com/photos/3I5j50pIXvU |
| `p1060.jpg` | A kettle pouring into a filter over a glass carafe | Karl Fredrickson | https://unsplash.com/photos/TYIzeCiZ_60 |
