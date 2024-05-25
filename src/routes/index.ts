import { Router } from "express"
import userRoute from "./userRoute"

const route = Router()

route.use('/', userRoute)

export default route