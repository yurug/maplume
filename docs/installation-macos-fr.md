# Installer MaPlume sur macOS

## Téléchargement

1. Rendez-vous sur la [page des releases](https://github.com/yurug/maplume/releases)
2. Téléchargez le dernier fichier `.dmg` (ex: `MaPlume-0.2.0.dmg`)

## Installation

1. **Ouvrir le fichier .dmg**
   - Double-cliquez sur le fichier `.dmg` téléchargé
   - Une nouvelle fenêtre Finder apparaîtra

2. **Glisser MaPlume vers Applications**
   - Glissez l'icône MaPlume vers le raccourci du dossier Applications dans la fenêtre

3. **Éjecter l'image disque**
   - Clic droit sur le disque "MaPlume" sur votre bureau ou dans la barre latérale du Finder
   - Sélectionnez "Éjecter"

## Premier lancement - Important !

Comme MaPlume n'est pas signé avec un certificat Apple Developer, macOS va le bloquer. Vous verrez l'un de ces messages d'erreur :

- *"MaPlume est endommagé et ne peut pas être ouvert"*
- *"MaPlume ne peut pas être ouvert car il provient d'un développeur non identifié"*

### Solution

Ouvrez le **Terminal** (vous le trouverez dans Applications → Utilitaires → Terminal) et exécutez cette commande :

```bash
xattr -cr /Applications/MaPlume.app
```

Ensuite, ouvrez MaPlume depuis votre dossier Applications. Ça devrait fonctionner !

### Méthode alternative

Si vous voyez *"ne peut pas être ouvert car il provient d'un développeur non identifié"* :

1. **Clic droit** (ou Contrôle+clic) sur MaPlume dans Applications
2. Sélectionnez **Ouvrir** dans le menu
3. Cliquez sur **Ouvrir** dans la boîte de dialogue qui apparaît

Vous n'avez besoin de faire cela qu'une seule fois.

---

## Pourquoi cette étape supplémentaire ?

Apple exige que les développeurs paient **99$/an** pour un compte Apple Developer afin de signer et notariser leurs applications. Sans cela, macOS considère l'application comme potentiellement dangereuse.

Cela crée une barrière pour les logiciels libres et gratuits comme MaPlume. Bien que nous comprenions les préoccupations de sécurité d'Apple, cette politique rend plus difficile pour les développeurs indépendants de distribuer des logiciels gratuits aux utilisateurs Mac.

**En résumé : Apple n'est pas très favorable aux logiciels libres.**

### Aidez-nous à obtenir un certificat Apple Developer

Si vous souhaitez nous aider à offrir une expérience d'installation plus fluide aux utilisateurs Mac, pensez à sponsoriser le projet :

<a href="https://github.com/sponsors/yurug">
  <img src="https://img.shields.io/badge/Sponsoriser-❤️-ea4aaa?style=for-the-badge&logo=github-sponsors" alt="Sponsoriser sur GitHub" />
</a>

Avec 99$/an de sponsoring, nous pourrons signer et notariser MaPlume pour que les utilisateurs Mac ne voient plus ces avertissements de sécurité.

---

## Mettre à jour MaPlume

MaPlume vérifie automatiquement les mises à jour. Quand une nouvelle version est disponible :

1. Vous verrez une notification dans l'application
2. La mise à jour se téléchargera automatiquement
3. Redémarrez MaPlume pour appliquer la mise à jour

Vous ne devriez **pas** avoir besoin d'exécuter la commande `xattr` à nouveau pour les mises à jour.

---

## Désinstallation

1. Ouvrez Finder → Applications
2. Glissez MaPlume vers la Corbeille
3. Videz la Corbeille

Vos données (projets, entrées) sont stockées dans le dossier que vous avez choisi lors de la configuration, elles ne seront donc pas supprimées avec l'application.
