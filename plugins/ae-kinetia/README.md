# Kinetia — Plugin for After Effects

CEP Extension v2.0.0 · After Effects 2022+

## Install (Development — unsigned)

1. Enable unsigned extensions in AE:
   - Mac: `defaults write com.adobe.CSXS.10 PlayerDebugMode 1`
   - Win: Registry `HKEY_CURRENT_USER\Software\Adobe\CSXS.10` → `PlayerDebugMode` = `1`

2. Copy this folder to the CEP extensions directory:
   - Mac: `~/Library/Application Support/Adobe/CEP/extensions/com.kinetia.panel`
   - Win: `%APPDATA%\Adobe\CEP\extensions\com.kinetia.panel`

3. Restart After Effects.

4. Open: **Window → Extensions → Kinetia**

5. Sign in with your Kinetia account (same credentials as the web app).

## Install (Production — signed .zxp)

Use ZXP Installer (aescripts.com/zxpinstaller) to install the `.zxp` file.
Restart After Effects, then **Window → Extensions → Kinetia**.

## Package as .zxp (requires ZXPSignCmd)

```bash
# From plugins/ae-kinetia parent directory:
ZXPSignCmd -selfSignedCert US CA Kinetia kinetia cert.p12 kinetia123
ZXPSignCmd -sign ae-kinetia kinetia.zxp cert.p12 kinetia123
```

## Usage

1. Upload a reference video on the Kinetia web app and generate a preset.
2. In After Effects, select a layer.
3. In the Kinetia panel, select a preset and choose a target property.
4. Click **Aplicar a capa seleccionada**.
5. Slider controls (KN Tensión, KN Fricción, etc.) appear in the Effects panel — tweak freely.

## Expression Controls added

Each preset adds named Slider Controls to the layer:

| Effect name     | Description                        |
|-----------------|------------------------------------|
| KN Tensión      | Spring stiffness (0–100)           |
| KN Fricción     | Damping (0–100)                    |
| KN Amplitud     | Max displacement (pixels)          |
| KN Decaimiento  | Exponential decay rate (0–20)      |
| KN Entrada      | Delay before animation starts (s)  |
