import { AssetLibrary } from "@/components/AssetLibrary";
import { OUTPUT_RETENTION_DAYS, RAW_RETENTION_DAYS } from "@/lib/storage-rules";

export default function ResourcesPage() {
  return (
    <div className="stack">
      <div>
        <h1>Mis recursos</h1>
        <p className="muted" style={{ margin: 0 }}>
          Tu carpeta en la nube: logo, capturas, fotos de antes y después, b-roll. Lo que subas acá lo podés usar en todos tus
          reels sin volver a subirlo.
        </p>
      </div>
      <AssetLibrary mode="manage" />
      <p className="muted small">
        Los recursos quedan guardados hasta que los borres. Los videos crudos se borran a los {RAW_RETENTION_DAYS} días y los
        reels editados a los {OUTPUT_RETENTION_DAYS}: descargalos cuando estén listos.
      </p>
    </div>
  );
}
