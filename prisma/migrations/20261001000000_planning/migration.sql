-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'PLANNING';
ALTER TYPE "TypeDocument" ADD VALUE 'VISA_PLANNING';

-- Documents : série et source. `serie` est remplie avant de devenir obligatoire.
ALTER TABLE "Document" ADD COLUMN "serie" TEXT, ADD COLUMN "sourceId" TEXT;
UPDATE "Document" SET "serie" = COALESCE("lotId", 'RECAPITULATIF');
ALTER TABLE "Document" ALTER COLUMN "serie" SET NOT NULL;

-- L'ancien index (NULLS NOT DISTINCT) n'admettait qu'une série sans lot par chantier.
DROP INDEX "Document_chantierId_lotId_version_key";
CREATE UNIQUE INDEX "Document_chantierId_serie_version_key" ON "Document"("chantierId", "serie", "version");

-- CreateTable
CREATE TABLE "Periode" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL DEFAULT '',
    "debut" DATE NOT NULL,
    "duree" INTEGER NOT NULL,
    "dependDeId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Periode_pkey" PRIMARY KEY ("id"),
    -- Écrite à la main : Prisma ne connaît pas les CHECK.
    CONSTRAINT "Periode_debut_lundi" CHECK (EXTRACT(ISODOW FROM "debut") = 1)
);

-- CreateTable
CREATE TABLE "Fermeture" (
    "id" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT 'Congés',
    "debut" DATE NOT NULL,
    "duree" INTEGER NOT NULL,

    CONSTRAINT "Fermeture_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Fermeture_debut_lundi" CHECK (EXTRACT(ISODOW FROM "debut") = 1)
);

-- CreateIndex
CREATE INDEX "Periode_lotId_idx" ON "Periode"("lotId");

-- CreateIndex
CREATE INDEX "Periode_dependDeId_idx" ON "Periode"("dependDeId");

-- CreateIndex
CREATE INDEX "Fermeture_chantierId_idx" ON "Fermeture"("chantierId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periode" ADD CONSTRAINT "Periode_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periode" ADD CONSTRAINT "Periode_dependDeId_fkey" FOREIGN KEY ("dependDeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fermeture" ADD CONSTRAINT "Fermeture_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
