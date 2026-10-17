# Mindustry weapon and debuff references

Researched 2026-10-16 for Drift Bastion. Use videos and official source;
the user stopped the local-game inspection. The user accepts build 40's general
fire direction and requested a narrower improvement to Scatter's module firing effect.

## Weapon tests

- [Testing Every Turret with Every Ammo — AerN](https://www.youtube.com/watch?v=FUHHu2oe-04): Serpulo turrets tested against waves, ammunition variants included. Visually inspected the incendiary ammunition section in Codex's built-in browser.
  - [2:33 Coal / Scorch](https://www.youtube.com/watch?v=FUHHu2oe-04&t=153s)
  - [2:47 Pyratite / incendiary ammunition](https://www.youtube.com/watch?v=FUHHu2oe-04&t=167s)
  - [4:56 Blast compound](https://www.youtube.com/watch?v=FUHHu2oe-04&t=296s)
  - [6:18 Surge alloy](https://www.youtube.com/watch?v=FUHHu2oe-04&t=378s)
  - [10:14 Water](https://www.youtube.com/watch?v=FUHHu2oe-04&t=614s)
  - [10:33 Slag](https://www.youtube.com/watch?v=FUHHu2oe-04&t=633s)
  - [11:07 Cryofluid](https://www.youtube.com/watch?v=FUHHu2oe-04&t=667s)
  - [11:40 Oil](https://www.youtube.com/watch?v=FUHHu2oe-04&t=700s)
  - [12:18 Electric weapons](https://www.youtube.com/watch?v=FUHHu2oe-04&t=738s)
- [Showcasing V7 Turrets — Eboy Plays](https://www.youtube.com/watch?v=-CFG1opNZXY): early Erekir Breach, Diffuse, Sublimate, Titan and Disperse. Diffuse is the closer shotgun reference for our Scatter than Mindustry's anti-air turret named Scatter. Visually inspected at 1:30: compact orange projectiles fan out ahead of the turret.
- [V7 New Turret Showcase — Creslegs](https://www.youtube.com/watch?v=3a23s_G-3h4): Erekir turret presentation. Early-access footage, useful for visual ideas rather than current balance values. Located; not visually inspected yet.
- [Endgame Turrets — ElectricGun, 2:07](https://www.youtube.com/watch?v=QaJoaWFVITs&t=127s): additional Erekir endgame weapons. Early preview; located, not visually inspected yet.

These chapters are ammunition sections, not a claim that every debuff is
demonstrated individually. A complete all-debuff video was not verified.

## All harmful built-in statuses in build 159.5

Verified against [official StatusEffects.java](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/StatusEffects.java)
and [official Fx.java](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/Fx.java).
Build 159.5 matches the version shown by the user's installed game.
Descriptions below are source-verified; they are not claims of watching every effect in footage.

| Status | Behavior | Presentation from source |
| --- | --- | --- |
| Burning | Damage over time | Tiny yellow/orange shrinking circles |
| Freezing | Slower, more vulnerable | Tiny cryofluid-blue circles |
| Wet | Slight slow; reacts with shock | Blue droplets |
| Muddy | Slight slow; hidden in database | Brown droplets |
| Melting | Damage over time, slow, more vulnerable | Hot slag-colored circles |
| Sapped | Slower, more vulnerable | Purple diamond particles |
| Electrified | Slower movement and firing | Green diamond particles |
| Spore Slowed | Slower movement | Shares the sapped particle effect |
| Tarred | Slower; interacts with fire/melting | Dark oil droplets |
| Corroded | Periodic damage | Pale vapor puffs |
| Unmoving | Stops movement | No dedicated attached particle effect |
| Slow | Strong slow; hidden in database | No dedicated attached particle effect |
| Disarmed | Disables weapons; hidden in database | No dedicated attached particle effect |
| Shocked | Reactive hit status; interacts with Wet | No persistent attached effect |
| Blasted | Reactive hit status; interacts with Freezing | No persistent attached effect |

Overdrive, Overclock, Fast, Shielded, Guardian/Boss and Invincible are boosts;
None and Dynamic are infrastructure statuses. They are outside this debuff list.
Overdrive has a small health tradeoff but provides an overall boost.

## Scatter adaptation

Build 41 removes Scatter's hull-local side dots and replaces the generic pale
muzzle ellipse on an actual incendiary volley with a short warm forward puff.
The cosmetic flag snapshots the volley; it follows the existing physical muzzle
attachment and recoil. Plain Scatter, Flak, Ember and hull fire retain their
existing presentation. Existing burst calls and combat randomness are preserved.
