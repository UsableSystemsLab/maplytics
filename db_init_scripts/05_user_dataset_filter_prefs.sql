----------------------------------------------------------
-- USER_DATASET_FILTER_PREFS TABLE
-- Per-user override of which fields appear in the map filter
-- drawer for a given dataset. Missing row = fall back to dataset
-- default (Dataset_Metadata.metadata.defaultFilterableFields), or
-- show all fields if no default exists.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."User_Dataset_Filter_Prefs" (
    "user_id"           VARCHAR(128) NOT NULL,
    "dataset_id"        UUID         NOT NULL,
    "filterable_fields" JSONB        NOT NULL,
    "created_at"        TIMESTAMP    DEFAULT NOW(),
    "updated_at"        TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY ("user_id", "dataset_id"),
    FOREIGN KEY ("dataset_id")
        REFERENCES public."Dataset"("dataset_id")
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_udfp_dataset
    ON public."User_Dataset_Filter_Prefs"("dataset_id");
