# TencentCloudDailySnapshot
一个基于腾讯云API接口，用于自动更新腾讯云轻量应用服务器每日快照的小脚本。
## 使用方法
在Github的Action secrets中填入腾讯云API密钥，将密钥分别填入`SECRET_ID`和`SECRET_KEY`，然后将轻量应用服务器的实例ID填入`INSTANCE_ID`。
## 注意
脚本默认只访问上海地区的实例。如果目标实例不在上海地区，需要修改`main.js`将常量`region`改为对应的地区。
