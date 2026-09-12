# Recover deleted Navex parcels

Sign in as an admin or manager, open **Colis Navex.tn**, and click **Récupérer les colis**. Keep the page open while recovery runs. The result shows restored parcels and any failed tracking codes; running it again retries missing parcels without overwriting existing ones.

Recovery requires surviving successful handover records in `navextnparcelscans` and a working `NAVEX_TN_STATUS_TOKEN`. It considers all missing parcels in that history, including parcels previously deleted intentionally. If the scan collection was also deleted, this feature cannot recover the tracking codes: a database backup or barcode export is needed.

The app reads current price, payment status and driver details from Navex. It restores the original handover date and operator, and successful physical return scans take precedence over carrier status. Historical payment dates are unavailable and remain empty. If Navex no longer recognizes a code or a request fails, that parcel is skipped and can be retried. Missing or invalid prices remain empty.

The recovery endpoint only reads from Navex; it inserts missing local records. It does not create shipments at the carrier.

Run the isolated recovery checks with `node scripts/test-navex-recovery.cjs` after installing dependencies. These checks use mocked database and carrier responses; they do not access production data.
