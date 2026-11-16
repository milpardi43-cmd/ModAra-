# Try-on art, review sheet

`try-on-pairs-before-after.png` — left column is the art currently shipped on `main`;
right column is the new shoot. Top row is `basic-tshirt-black-men`, bottom row is the
female panel of the same pair.

The change is deliberate in three ways:

1. **Both mannequins are new.** New faces, new builds, and a new pose language — the old
   art is a smiling, mid-stride catalogue model with props; the new art is a still,
   straight-to-camera editorial stance.
2. **The styling is new.** Editorial light: a hard key from the upper left, a warm rim on
   the model's right, sculpted shadows that keep the fabric readable, deep contrast.
   Fewer props — one bag, only on the looks that call for one.
3. **The two people are the same in every one of the 17 looks.** Each look is generated
   once as a matched pair and the next look is conditioned on the first, so the wardrobe
   is one campaign rather than seventeen catalogue photos.

How the artwork is prepared is documented in `scripts/tryon_plates.py`; the shooting
spec and the reference-chain rule are in `scripts/try-on-pairs.mjs`.
