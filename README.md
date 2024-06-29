# Delete Packages GitHub Action

GitHub action to determine and delete existing versions of GitHub packages.

The application can handle versions of the type *&lt;major&gt;.&lt;minor&gt;.&lt;patch&gt;* or
*&lt;major&gt;.&lt;minor&gt;.&lt;patch&gt;-SNAPSHOT*. If *minor* or *patch* are missing they will be handled as zero.

:rocket: This action uses [Ma-Vin/packages-action-app](https://github.com/Ma-Vin/packages-action-app) to process the main logic. The ***golang*** binary will be downloaded from [release v1.1.1](https://github.com/Ma-Vin/packages-action-app/releases/tag/v1.1.1)

:baby_chick: :construction_worker: This repository and [Ma-Vin/packages-action-app](https://github.com/Ma-Vin/packages-action-app) are just a try out of GitHub Action, GoLang and GitHub rest api. In normal case the process logic of this use case won't be split into two Node.js and GoLang applications.

[![packages-action-app](https://img.shields.io/badge/Ma--Vin//packages--action--app-v1.1.1-geen?logo=github)](https://github.com/Ma-Vin/packages-action-app/releases/tag/v1.1.1)


![NodeJsV20](https://img.shields.io/badge/Node.js-v20-geen?logo=nodedotjs)
![GoV1.22](https://img.shields.io/badge/Go-v1.22-blue?logo=go)


## Supported platforms and archs
The binaries of the GoLang project are compiled and released for the following combinations:

![LinuxX64](https://img.shields.io/badge/Linux-x64-yellow?logo=linux) ![LinuxArm64](https://img.shields.io/badge/Linux-arm64-yellow?logo=linux)
![WindowsX64](https://img.shields.io/badge/Windows-x64-blue?logo=windows) ![WindowsArm64](https://img.shields.io/badge/Windows-arm64-blue?logo=windows)


## Inputs

### `github_rest_api_url`
 **Default** `"https://api.github.com"` - Protocol and host of the GitHub rest api.

### `github_token`
**Required**  - The access token to use for bearer authentication against GitHub rest api.

### `dry_run`
**Default** `true` - Indicator whether to print deletion candidates only or to delete versions/package.

### `github_user`
**Required**  - GitHub user who is the owner of the packages.

### `package_type`
**Required**  - The type of package. At the moment only maven is supported (In general there exists *npm, maven, rubygems, docker, nuget, container*).

### `package_name`
**Required**  - The name of the package whose versions should be deleted.

### `version_name_to_delete`
A concrete version to delete (Independent of *number_major_to_keep number_minor_to_keep* and *number_patch_to_keep*).

### `delete_snapshots`
**Default** `false` - Indicator whether to delete all snapshots or none (Snapshots are excluded from *number_major_to_keep number_minor_to_keep* and *number_patch_to_keep*)

### `number_major_to_keep`
Positive number of major versions to keep.

### `number_minor_to_keep`
Positive number of minor versions to keep (within a major version).

### `number_patch_to_keep`
Positive number of patch versions to keep (within a minor version).

### `debug_logs`
**Default** `false` - Indicator whether to log addtional logs (At the moment only header information in case of rest call failure will be logged).

### `rest_timeout`
**Default** `3` - Client timeout for rest calls.

### Important:
At least one deletion indicator of *version_name_to_delete, delete_snapshots, number_major_to_keep number_minor_to_keep* or *number_patch_to_keep* must be set.

:warning: If there will remain an empty package, the whole package will be deleted instead of its versions :warning:


## Example usage

### First Example

Delete major, minor and patch versions of the `maven` package `com.github.ma-vin.examplepackage` at `Ma-Vin` user 
packages with github token from repository secrets ([Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions))

```yaml
uses: ma-vin/packages-action@v1.0
with:
  github_token: '${{ secrets.PersonalAccessTokenAtSecret }}'
  dry_run: false
  github_user: 'Ma-Vin'
  package_type: 'maven'
  package_name: 'com.github.ma-vin.examplepackage'
  number_major_to_keep: 3
  number_minor_to_keep: 2
  number_patch_to_keep: 1
```


### Second Excample

Test run for all snapshot versions of the `maven` package `com.github.ma-vin.examplepackage` at `Ma-Vin` user 
packages, but without deleting them:

```yaml
uses: ma-vin/packages-action@v1.0
with:
  github_token: '${{ secrets.PersonalAccessTokenAtSecret }}'
  dry_run: true
  github_user: 'Ma-Vin'
  package_type: 'maven'
  package_name: 'com.github.ma-vin.examplepackage'
  delete_snapshots: true
```