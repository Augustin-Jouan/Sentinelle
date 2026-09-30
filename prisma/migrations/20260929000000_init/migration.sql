-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Mission" AS ENUM ('COMPLETE', 'PARTIELLE');

-- CreateEnum
CREATE TYPE "Nature" AS ENUM ('GRE_A_GRE', 'SOUS_TRAITANCE');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('MARCHE_GRE_A_GRE', 'MARCHE_SOUS_TRAITANCE', 'RECAPITULATIF');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "initiales" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compte" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametres" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "raisonSociale" TEXT NOT NULL,
    "libelleActivite" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "cp" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "fax" TEXT,
    "email" TEXT,
    "villeSignature" TEXT NOT NULL,

    CONSTRAINT "Parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artisan" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL DEFAULT '',
    "cp" TEXT NOT NULL DEFAULT '',
    "commune" TEXT NOT NULL DEFAULT '',
    "interlocuteur" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Artisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chantier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "maitreOuvrage" TEXT NOT NULL,
    "adresseClient" TEXT NOT NULL DEFAULT '',
    "natureTravaux" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "cp" TEXT NOT NULL DEFAULT '',
    "commune" TEXT NOT NULL DEFAULT '',
    "mission" "Mission" NOT NULL DEFAULT 'COMPLETE',
    "dateSignaturePrevue" DATE,
    "termine" BOOLEAN NOT NULL DEFAULT false,
    "chargeAffaireId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creeParId" TEXT NOT NULL,

    CONSTRAINT "Chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "numero" TEXT,
    "designation" TEXT NOT NULL,
    "nature" "Nature" NOT NULL DEFAULT 'GRE_A_GRE',
    "artisanId" TEXT,
    "montantHtInitial" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "tauxTva" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "retenueGarantie" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "exemplaires" INTEGER NOT NULL DEFAULT 3,
    "corpsEtat" TEXT NOT NULL DEFAULT '',
    "travaux" TEXT NOT NULL DEFAULT '',
    "clauseParticuliere" TEXT NOT NULL DEFAULT '',
    "couleur" TEXT NOT NULL DEFAULT 'noir',
    "dateSignature" DATE,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "lotId" TEXT,
    "type" "TypeDocument" NOT NULL,
    "version" INTEGER NOT NULL,
    "donnees" JSONB NOT NULL,
    "empreinte" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creeParId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Artisan_nom_key" ON "Artisan"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Chantier_reference_key" ON "Chantier"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_chantierId_ordre_key" ON "Lot"("chantierId", "ordre");

-- CreateIndex
-- Un lotId nul (récapitulatif) doit aussi être unique par version : Postgres 15+.
CREATE UNIQUE INDEX "Document_chantierId_lotId_version_key" ON "Document"("chantierId", "lotId", "version") NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compte" ADD CONSTRAINT "compte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chantier" ADD CONSTRAINT "Chantier_chargeAffaireId_fkey" FOREIGN KEY ("chargeAffaireId") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chantier" ADD CONSTRAINT "Chantier_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

