-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'COMPTE_RENDU';
ALTER TYPE "TypeDocument" ADD VALUE 'PV_RECEPTION';

-- CreateEnum
CREATE TYPE "StatutCompteRendu" AS ENUM ('BROUILLON', 'ENREGISTRE');

-- CreateEnum
CREATE TYPE "DecisionReception" AS ENUM ('SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE');

-- AlterTable : la ligne existante reçoit la valeur par défaut, l'adresse du site imprimée par la maquette.
ALTER TABLE "Parametres" ADD COLUMN "siteWeb" TEXT DEFAULT 'socoreve-chateaubriant.com';

-- AlterTable
ALTER TABLE "Chantier" ADD COLUMN "receptionDate" DATE,
ADD COLUMN "receptionSignataire" TEXT NOT NULL DEFAULT '',
ADD COLUMN "contratMoeDate" DATE,
ADD COLUMN "receptionMaitreOeuvre" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CompteRendu" (
    "id" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "statut" "StatutCompteRendu" NOT NULL DEFAULT 'BROUILLON',
    "numero" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "rdvDate" DATE,
    "rdvHeure" TEXT,
    "avancement" TEXT NOT NULL DEFAULT '',
    "coordination" TEXT NOT NULL DEFAULT '',
    "redacteur" TEXT NOT NULL DEFAULT '',
    "portable" TEXT NOT NULL DEFAULT '',
    "convocations" JSONB NOT NULL DEFAULT '{}',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompteRendu_pkey" PRIMARY KEY ("id"),
    -- Écrites à la main : Prisma ne connaît pas les CHECK.
    CONSTRAINT "CompteRendu_numero_borne" CHECK ("numero" BETWEEN 1 AND 999),
    -- Même expression que HEURE_VALIDE (src/domaine/compteRendu.ts).
    CONSTRAINT "CompteRendu_heure_valide" CHECK ("rdvHeure" IS NULL OR "rdvHeure" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    CONSTRAINT "CompteRendu_heure_avec_date" CHECK ("rdvHeure" IS NULL OR "rdvDate" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "decision" "DecisionReception" NOT NULL DEFAULT 'SANS_RESERVES',
    "dateEffet" DATE,
    "reserves" TEXT NOT NULL DEFAULT '',
    "delai" TEXT NOT NULL DEFAULT '',
    "motifs" TEXT NOT NULL DEFAULT '',
    "representant" TEXT NOT NULL DEFAULT '',
    "reservesLeveesLe" DATE,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompteRendu_chantierId_numero_key" ON "CompteRendu"("chantierId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Reception_lotId_key" ON "Reception"("lotId");

-- AddForeignKey
ALTER TABLE "CompteRendu" ADD CONSTRAINT "CompteRendu_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
