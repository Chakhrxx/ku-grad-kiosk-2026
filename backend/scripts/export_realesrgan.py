"""Real-ESRGAN realesr-general-x4v3 (SRVGGNetCompact, from the official .pth) to ONNX, then a quick parity check.

One-off, to rebuild models/realesr-general-x4v3.onnx; needs torch and onnx (not backend dependencies).
See models/README.md."""

import sys

import numpy as np
import onnxruntime as ort
import torch
from torch import nn
from torch.nn import functional as F


class SRVGGNetCompact(nn.Module):  # as in xinntao/Real-ESRGAN realesrgan/archs/srvgg_arch.py
    def __init__(self, num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4):
        super().__init__()
        self.upscale = upscale
        self.body = nn.ModuleList([nn.Conv2d(num_in_ch, num_feat, 3, 1, 1), nn.PReLU(num_parameters=num_feat)])
        for _ in range(num_conv):
            self.body.append(nn.Conv2d(num_feat, num_feat, 3, 1, 1))
            self.body.append(nn.PReLU(num_parameters=num_feat))
        self.body.append(nn.Conv2d(num_feat, num_out_ch * upscale * upscale, 3, 1, 1))
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for layer in self.body:
            out = layer(out)
        return self.upsampler(out) + F.interpolate(x, scale_factor=self.upscale, mode="nearest")


pth, onnx_out = sys.argv[1], sys.argv[2]
state = torch.load(pth, map_location="cpu", weights_only=True)
state = state.get("params_ema", state.get("params", state))
net = SRVGGNetCompact()
net.load_state_dict(state, strict=True)
net.eval()
dummy = torch.rand(1, 3, 64, 48)
torch.onnx.export(
    net,
    dummy,
    onnx_out,
    input_names=["input"],
    output_names=["output"],
    opset_version=17,
    dynamic_axes={"input": {2: "h", 3: "w"}, "output": {2: "h4", 3: "w4"}},
    dynamo=False,
)
s = ort.InferenceSession(onnx_out, providers=["CPUExecutionProvider"])
with torch.no_grad():
    ref = net(dummy).numpy()
got = s.run(None, {"input": dummy.numpy()})[0]
print("export ok, max diff vs torch", float(np.abs(ref - got).max()))
