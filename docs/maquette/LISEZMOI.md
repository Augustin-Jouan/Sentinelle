# La maquette

`sentinelle-marches.html` est la maquette fonctionnelle d'origine : un seul fichier HTML, ses données dans le
navigateur. Elle a donné à l'app son identité (le « bleu de plan », les polices, les rondeurs) et ses écrans.

Elle est désormais une **référence**, et seulement cela :

- elle ne génère plus rien : ni CSS, ni jetons, ni captures ;
- elle ne se modifie plus pour faire évoluer l'app. Un changement d'interface se fait dans les jetons, le thème
  ou les briques (`docs/interface.md`), puis se vérifie au banc visuel (`npm run test:visuel`) ;
- ses notes d'en-tête (le commentaire en tête du fichier) restent valables pour le métier : à quoi sert chaque
  document, les règles de calcul, le vocabulaire.

Elle s'ouvre directement dans un navigateur, sans serveur.
