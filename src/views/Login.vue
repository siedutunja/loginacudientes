<template>
  <div class="flex-row align-items-center pt-5">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol md="4">
          <CCardGroup>
            <CCard class="p-4">
              <CCardBody>
                <b-form @submit.stop.prevent="paso === 1 ? solicitarCodigo() : validarCodigoOTP()">
                  <img src="escudo-tunja.png" height="45" class="float-left mr-2"/>
                  <h1>sieduTunja</h1>
                  <div class="small text-muted text-medium-emphasis float-right">
                    Acudientes {{version}}
                  </div>
                  <hr class="mt-4">
                  <h5 class="text-muted">Iniciar Sesión</h5>
                  <b-input-group>
                    <template #prepend>
                      <b-input-group-text><CIcon name="cil-user"/></b-input-group-text>
                    </template>
                    <b-form-input type="text" v-model.trim="usuario" placeholder="Usuario (Cédula del acudiente)" ref="usuario"></b-form-input>
                  </b-input-group>

                  <div v-if="paso === 2" class="mt-3">
                    <b-input-group>
                      <template #prepend>
                        <b-input-group-text><CIcon name="cil-lock-locked"/></b-input-group-text>
                      </template>
                      <b-form-input type="text" maxlength="6" v-model.trim="codigo" placeholder="Código OTP de 6 dígitos" ref="codigo"></b-form-input>
                    </b-input-group>
                    <small class="text-muted d-block mt-2">El código expira en {{ formatoTiempo(segundosExpira) }}</small>
                    <small class="text-danger d-block" v-if="segundosExpira <= 0">El código expiró. Genere uno nuevo.</small>
                  </div>

                  <b-button v-if="paso === 1" type="submit" class="btn mb-2 mt-4 btn-block" variant="primary" :disabled="solicitandoCodigo">
                    {{ solicitandoCodigo ? 'Enviando...' : 'Enviar Código' }}
                  </b-button>
                  <b-button v-else type="submit" class="btn mb-2 mt-4 btn-block" variant="primary" :disabled="segundosExpira <= 0 || validandoCodigo || solicitandoCodigo">
                    {{ validandoCodigo ? 'Validando...' : 'Validar Código' }}
                  </b-button>

                  <b-input-group class="mt-2" v-if="paso === 2">
                    <template #prepend>
                      <b-input-group-text><CIcon name="cil-loop-circular"/></b-input-group-text>
                    </template>
                    <b-button class="btn-block" variant="outline-primary" :disabled="segundosReenvio > 0 || solicitandoCodigo || validandoCodigo" @click="solicitarCodigo">
                      {{ solicitandoCodigo ? 'Enviando...' : (segundosReenvio > 0 ? ('Reenviar en ' + formatoTiempo(segundosReenvio)) : 'Generar Nuevo Código') }}
                    </b-button>
                  </b-input-group>
                </b-form>
              </CCardBody>
            </CCard>
          </CCardGroup>
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>

<script>
  import { version } from '@/../package.json'
  import axios from "axios"
  import * as CONFIG from '@/assets/config.js'

  export default {
    name: 'Login',
    data () {
      return {
        usuario: '',
        codigo: '',
        paso: 1,
        segundosExpira: 0,
        segundosReenvio: 0,
        solicitandoCodigo: false,
        validandoCodigo: false,
        timerId: null,
        version: version
      }
    },
    methods: {
      iniciarTemporizador() {
        if (this.timerId) clearInterval(this.timerId)
        this.timerId = setInterval(() => {
          if (this.segundosExpira > 0) this.segundosExpira -= 1
          if (this.segundosReenvio > 0) this.segundosReenvio -= 1
        }, 1000)
      },
      formatoTiempo(segundos) {
        const min = Math.floor(Math.max(segundos, 0) / 60)
        const seg = Math.max(segundos, 0) % 60
        return `${min}:${seg < 10 ? '0' + seg : seg}`
      },
      async solicitarCodigo() {
        if (this.solicitandoCodigo) return

        if (!this.usuario) {
          this.mensajeEmergente('warning', CONFIG.TITULO_MSG, 'Digite el usuario (cédula del acudiente).')
          this.$refs.usuario.focus()
          return
        }

        if (this.paso === 2 && this.segundosReenvio > 0) {
          this.mensajeEmergente('warning', CONFIG.TITULO_MSG, `Debe esperar ${this.segundosReenvio}s para reenviar.`)
          return
        }

        this.solicitandoCodigo = true

        try {
          const response = await axios.post(CONFIG.ROOT_PATH + 'acudientes/auth/solicitar-codigo', {
            documento: this.usuario,
            vigencia: new Date().getFullYear(),
            idInstitucion: CONFIG.ID_INSTITUCION
          })

          if (response.data.error) {
            if (response.data.segundosReenvio) {
              this.paso = 2
              this.segundosReenvio = Number(response.data.segundosReenvio || 0)
              if (!this.segundosExpira || this.segundosExpira <= 0) this.segundosExpira = 300
              this.iniciarTemporizador()
            }
            this.mensajeEmergente('warning', CONFIG.TITULO_MSG, response.data.mensaje)
          } else {
            this.paso = 2
            this.codigo = ''
            this.segundosExpira = Number(response.data.datos.expiraEnSegundos || 300)
            this.segundosReenvio = Number(response.data.datos.reenvioEnSegundos || 60)
            const ultimos4 = response.data.datos.telefonoUltimos4 || '****'
            this.iniciarTemporizador()
            this.$nextTick(() => this.$refs.codigo && this.$refs.codigo.focus())
            this.mensajeEmergente('success', CONFIG.TITULO_MSG, `Se envió un código al celular que termina en ${ultimos4}.`)
          }
        } catch (err) {
          this.mensajeEmergente('danger', CONFIG.TITULO_MSG, 'No se pudo generar el código. Intente más tarde. ' + err)
        } finally {
          this.solicitandoCodigo = false
        }
      },
      async validarCodigoOTP() {
        if (this.validandoCodigo) return

        if (!this.codigo || this.codigo.length !== 6) {
          this.mensajeEmergente('warning', CONFIG.TITULO_MSG, 'Digite el código de 6 dígitos.')
          this.$refs.codigo.focus()
          return
        }

        if (this.segundosExpira <= 0) {
          this.mensajeEmergente('warning', CONFIG.TITULO_MSG, 'El código expiró. Genere uno nuevo.')
          return
        }

        this.validandoCodigo = true

        await axios.post(CONFIG.ROOT_PATH + 'acudientes/auth/validar-codigo', {
          documento: this.usuario,
          codigo: this.codigo,
          vigencia: new Date().getFullYear(),
          idInstitucion: CONFIG.ID_INSTITUCION
        }).then(response => {
          if (response.data.error) {
            this.mensajeEmergente('danger', CONFIG.TITULO_MSG, response.data.mensaje)
          } else {
            const token = response.data.datos.token
            //const moduloUrl = response.data.datos.moduloUrl || CONFIG.ROOT_MODULO_ACUDIENTES
            const moduloUrl = CONFIG.ROOT_MODULO_ACUDIENTES
            location.replace(moduloUrl + '?token=' + token)
          }
        }).catch(err => {
          this.mensajeEmergente('danger', CONFIG.TITULO_MSG, 'No se pudo validar el código. Intente más tarde. ' + err)
        }).finally(() => {
          this.validandoCodigo = false
        })
      },
      mensajeEmergente(variante, titulo, contenido) {
        this.$bvToast.toast(contenido, { title: titulo, variant: variante, toaster: "b-toaster-top-center", solid: true, autoHideDelay: 4000, appendToast: false })
      }
    },
    beforeDestroy() {
      if (this.timerId) clearInterval(this.timerId)
    },
    beforeMount () {
      sessionStorage.clear()
    }
  }
</script>