This Project is to ease the uploading of Imagery data and adding field and plot boundaries to drone data.

# Ag Vision UI

### Author: dan@agdmalabs.com

## Features
### Data upload
* Upload raw images from mobile devices. (Currently not supporting plot meatada).
* Upload rover data
* Upload raw drone data
* Upload the ground control points.
* Upload the orthomosaics.
* Upload the DEM maps.
* Upload the field boundary
* Upload the plot boundaries

### Data Augmentation
* Ability to draw the field boundary on drone data.
* Ability to augment the plot boundaries.

### Data Bricks Start Via CLI.
* build with 'npm run build'
* If the app does not exist on databricks you will neeed to create it.
* Sync the code to databricks... 'databricks sync . /Workspace/Users/dan@agdmalabs.com/agv-ui'
* deploy on datarbicks... 'databricks apps deploy agv-ui \                            
  --source-code-path /Workspace/Users/dan@agdmalabs.com/agv-ui \
  --profile artemis'

### Set up
* Teams will need to set the Catalog, schema, and volume where the data should be stored.
* EX: 
  * Catalog: use1_prod_artemis_catalog_3718194974443840
  * Schema: Tier1_raw
  * Volume: data
